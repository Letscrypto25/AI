const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createRequire } = require('module');

const ROOT = process.env.TRANSFER_ROOT
  ? path.resolve(process.env.TRANSFER_ROOT)
  : path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env.local');
const BATCH_SIZE = Number(process.env.TRANSFER_BATCH_SIZE || 2500);
const SECTION_LIMIT = Number(process.env.TRANSFER_SECTION_LIMIT || 50000);
const BOT_ACTIVITIES_DAYS = Number(process.env.TRANSFER_BOT_ACTIVITIES_DAYS || 30);
const BOT_ACTIVITIES_CUTOFF = process.env.TRANSFER_BOT_ACTIVITIES_CUTOFF || null;
const projectRequire = createRequire(path.join(ROOT, 'package.json'));
const { Client } = projectRequire('pg');

function parseEnvLocal() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(`Missing ${ENV_PATH}`);
  }

  const groups = { active: {}, commented: {} };
  const lines = fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^\s*(#?)\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const state = match[1] ? 'commented' : 'active';
    const key = match[2];
    let value = match[3].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in groups[state])) groups[state][key] = value;
  }

  return groups;
}

function encodePart(value) {
  return encodeURIComponent(value).replace(/%3A/gi, ':');
}

function resolveDatabaseUrl(rawUrl, envGroup, label, options = {}) {
  if (!rawUrl) throw new Error(`Missing ${label} DATABASE_URL`);
  const trimmed = rawUrl.trim();

  if (trimmed.includes('@')) {
    const url = new URL(trimmed);
    if (options.forcePassword) {
      url.password = options.forcePassword;
    } else if (options.preferEnvPassword || !url.password) {
      const password = envGroup.PGPASSWORD || envGroup.POSTGRES_PASSWORD || '';
      if (password) url.password = password;
    }
    return url.toString();
  }

  const withoutScheme = trimmed.replace(/^postgres(?:ql)?:\/\//i, '');
  const hostPort = withoutScheme.replace(/\/.*$/, '');
  const host = hostPort.includes(':') ? hostPort.split(':')[0] : hostPort;
  const port = hostPort.includes(':') ? hostPort.split(':')[1] : (envGroup.PGPORT || '5432');
  const user = envGroup.PGUSER || envGroup.POSTGRES_USER || 'postgres';
  const password = envGroup.PGPASSWORD || envGroup.POSTGRES_PASSWORD || '';
  const database = envGroup.PGDATABASE || envGroup.POSTGRES_DB || 'postgres';

  return `postgresql://${encodePart(user)}:${encodePart(options.forcePassword || password)}@${host}:${port}/${database}`;
}

function redactUrl(connectionString) {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: url.port || '5432',
    db: url.pathname.replace(/^\//, '') || 'postgres',
    user: decodeURIComponent(url.username || 'postgres'),
    hasPassword: Boolean(url.password),
  };
}

function getConnections() {
  const env = parseEnvLocal();
  const sourceUrl = resolveDatabaseUrl(env.active.DATABASE_URL, env.active, 'active source', {
    preferEnvPassword: process.env.PREFER_ENV_PASSWORD === '1',
  });
  const targetRaw = env.commented.TARGET_DATABASE_URL || env.commented.DATABASE_URL;
  const targetUrl = resolveDatabaseUrl(targetRaw, env.commented, 'commented target', {
    preferEnvPassword: true,
  });

  return {
    sourceUrl,
    targetUrl,
    sourceSummary: redactUrl(sourceUrl),
    targetSummary: redactUrl(targetUrl),
  };
}

function getSkipTables() {
  return new Set(
    String(process.env.TRANSFER_SKIP_TABLES || '')
      .split(',')
      .map((table) => table.trim())
      .filter(Boolean),
  );
}

function getTargetCandidates() {
  const env = parseEnvLocal();
  const targetRaw = env.commented.TARGET_DATABASE_URL || env.commented.DATABASE_URL;
  const candidates = [];
  const seen = new Set();
  const add = (label, options = {}) => {
    try {
      const connectionString = resolveDatabaseUrl(targetRaw, env.commented, 'commented target', options);
      if (seen.has(connectionString)) return;
      seen.add(connectionString);
      candidates.push({ label, connectionString });
    } catch (error) {
      candidates.push({ label, error });
    }
  };

  add('url-password');
  add('commented-password-vars', { preferEnvPassword: true });
  if (env.commented.PGPASSWORD) add('commented-pgpassword', { forcePassword: env.commented.PGPASSWORD });
  if (env.commented.POSTGRES_PASSWORD) add('commented-postgres-password', { forcePassword: env.commented.POSTGRES_PASSWORD });
  if (env.active.PGPASSWORD) add('active-pgpassword', { forcePassword: env.active.PGPASSWORD });
  if (env.active.POSTGRES_PASSWORD) add('active-postgres-password', { forcePassword: env.active.POSTGRES_PASSWORD });

  return candidates;
}

function clientConfig(connectionString) {
  const url = new URL(connectionString);
  const wantsSsl =
    url.searchParams.get('sslmode') === 'require' ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('pooler.supabase.com');

  return {
    connectionString,
    ssl: wantsSsl ? { rejectUnauthorized: false } : undefined,
  };
}

function qIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function qTable(schema, table) {
  return `${qIdent(schema)}.${qIdent(table)}`;
}

async function getTables(client) {
  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return result.rows.map((row) => row.table_name);
}

async function getOrderedTables(client, tables) {
  const tableSet = new Set(tables);
  const depsResult = await client.query(`
    SELECT
      tc.relname AS table_name,
      rc.relname AS referenced_table
    FROM pg_constraint c
    JOIN pg_class tc ON tc.oid = c.conrelid
    JOIN pg_namespace tn ON tn.oid = tc.relnamespace
    JOIN pg_class rc ON rc.oid = c.confrelid
    JOIN pg_namespace rn ON rn.oid = rc.relnamespace
    WHERE c.contype = 'f'
      AND tn.nspname = 'public'
      AND rn.nspname = 'public'
  `);

  const deps = new Map(tables.map((table) => [table, new Set()]));
  for (const row of depsResult.rows) {
    if (
      tableSet.has(row.table_name) &&
      tableSet.has(row.referenced_table) &&
      row.table_name !== row.referenced_table
    ) {
      deps.get(row.table_name).add(row.referenced_table);
    }
  }

  const ordered = [];
  const remaining = new Set(tables);
  while (remaining.size) {
    const ready = [...remaining].filter((table) => {
      for (const dep of deps.get(table) || []) {
        if (remaining.has(dep)) return false;
      }
      return true;
    });

    if (!ready.length) {
      ordered.push(...[...remaining].sort());
      break;
    }

    ready.sort();
    for (const table of ready) {
      ordered.push(table);
      remaining.delete(table);
    }
  }

  return ordered;
}

async function getColumns(client, table) {
  const result = await client.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND COALESCE(is_generated, 'NEVER') = 'NEVER'
    ORDER BY ordinal_position
  `, [table]);

  return result.rows.map((row) => ({
    name: row.column_name,
    dataType: row.data_type,
    udtName: row.udt_name,
  }));
}

async function describeTable() {
  const table = process.argv[3];
  if (!table) throw new Error('Usage: node table-transfer-env.cjs describe-table <table>');

  const connections = getConnections();
  const source = new Client(clientConfig(connections.sourceUrl));
  await source.connect();

  try {
    const columns = await getColumns(source, table);
    for (const column of columns) {
      console.log(`- ${column.name}: ${column.dataType} (${column.udtName})`);
    }
  } finally {
    await source.end().catch(() => {});
  }
}

async function countRows(client, table) {
  const filter = getTableFilter(table);
  const result = await client.query(
    `SELECT count(*)::bigint AS count FROM ${qTable('public', table)}${filter.clause}`,
    filter.values,
  );
  return BigInt(result.rows[0].count);
}

function getBotActivitiesCutoff() {
  if (BOT_ACTIVITIES_CUTOFF) return BOT_ACTIVITIES_CUTOFF;
  const cutoff = new Date(Date.now() - BOT_ACTIVITIES_DAYS * 24 * 60 * 60 * 1000);
  return cutoff.toISOString().replace('T', ' ').replace('Z', '');
}

function getTableFilter(table) {
  if (table === 'bot_activities') {
    return {
      clause: ' WHERE created_at >= $1::timestamp',
      values: [getBotActivitiesCutoff()],
      label: `created_at >= ${getBotActivitiesCutoff()}`,
    };
  }

  return { clause: '', values: [], label: 'all rows' };
}

async function countExcludedBotActivities(client) {
  const result = await client.query(
    `SELECT count(*)::bigint AS count FROM ${qTable('public', 'bot_activities')} WHERE created_at < $1::timestamp`,
    [getBotActivitiesCutoff()],
  );
  return BigInt(result.rows[0].count);
}

async function getPrimaryKeyColumns(client, table) {
  const result = await client.query(`
    SELECT a.attname AS column_name
    FROM pg_index i
    JOIN pg_attribute a
      ON a.attrelid = i.indrelid
     AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = $1::regclass
      AND i.indisprimary
    ORDER BY array_position(i.indkey, a.attnum)
  `, [`public.${table}`]);

  return result.rows.map((row) => row.column_name);
}

async function getOrderByClause(client, table) {
  const primaryKeyColumns = await getPrimaryKeyColumns(client, table);
  if (primaryKeyColumns.length) {
    return primaryKeyColumns.map((column) => qIdent(column)).join(', ');
  }

  return 'ctid';
}

async function getMaxColumnValue(client, table, column) {
  const result = await client.query(`SELECT MAX(${qIdent(column)}) AS max_value FROM ${qTable('public', table)}`);
  return result.rows[0]?.max_value ?? null;
}

function prepareValue(column, value) {
  if (value === null || value === undefined) return value;
  if (column.udtName === 'json' || column.udtName === 'jsonb') {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
  return value;
}

function buildInsert(table, columns, rows) {
  const colList = columns.map((column) => qIdent(column.name)).join(', ');
  const values = [];
  const placeholders = rows.map((row, rowIndex) => {
    const cells = columns.map((column, colIndex) => {
      values.push(prepareValue(column, row[column.name]));
      const index = rowIndex * columns.length + colIndex + 1;
      if (column.udtName === 'json') return `$${index}::json`;
      if (column.udtName === 'jsonb') return `$${index}::jsonb`;
      return `$${index}`;
    });
    return `(${cells.join(', ')})`;
  });

  return {
    text: `INSERT INTO ${qTable('public', table)} (${colList}) OVERRIDING SYSTEM VALUE VALUES ${placeholders.join(', ')}`,
    values,
  };
}

async function copyTable(source, target, table, options = {}) {
  const columns = await getColumns(source, table);
  if (!columns.length) {
    console.log(`- ${table}: skipped, no insertable columns`);
    return { table, sourceCount: 0n, targetCount: await countRows(target, table) };
  }

  const sourceCount = await countRows(source, table);
  const offset = BigInt(options.offset || 0);
  const limit = options.limit ? BigInt(options.limit) : sourceCount;
  const sectionEnd = sourceCount < offset + limit ? sourceCount : offset + limit;
  console.log(`- ${table}: ${sourceCount.toString()} rows${options.limit ? `, section ${offset.toString()}-${sectionEnd.toString()}` : ''}`);
  if (sourceCount === 0n) {
    return { table, sourceCount, targetCount: await countRows(target, table) };
  }

  const effectiveBatchSize = Math.max(1, Math.min(BATCH_SIZE, Math.floor(60000 / columns.length)));
  const selectColumns = columns.map((column) => qIdent(column.name)).join(', ');
  const orderBy = options.limit ? await getOrderByClause(source, table) : '';
  const filter = getTableFilter(table);
  const filterValues = [...filter.values];
  let filterClause = filter.clause;
  if (options.resumeColumn && options.resumeAfter !== null && options.resumeAfter !== undefined) {
    const keyword = filterClause ? ' AND' : ' WHERE';
    filterClause += `${keyword} ${qIdent(options.resumeColumn)} > $${filterValues.length + 1}`;
    filterValues.push(options.resumeAfter);
  }
  if (filter.label !== 'all rows') console.log(`  filter: ${filter.label}`);
  const cursorName = `transfer_${table.replace(/[^A-Za-z0-9_]/g, '_')}_${Date.now()}`;
  let copied = 0n;

  await source.query('BEGIN');
  try {
    const query = options.limit
      ? `SELECT ${selectColumns} FROM ${qTable('public', table)}${filterClause} ORDER BY ${orderBy}${options.resumeColumn ? '' : ` OFFSET ${offset.toString()}`} LIMIT ${limit.toString()}`
      : `SELECT ${selectColumns} FROM ${qTable('public', table)}${filterClause}`;
    await source.query(`DECLARE ${qIdent(cursorName)} NO SCROLL CURSOR FOR ${query}`, filterValues);

    while (true) {
      const batch = await source.query(`FETCH FORWARD ${effectiveBatchSize} FROM ${qIdent(cursorName)}`);
      if (!batch.rows.length) break;

      const insert = buildInsert(table, columns, batch.rows);
      await target.query('BEGIN');
      try {
        await target.query(insert.text, insert.values);
        await target.query('COMMIT');
      } catch (error) {
        await target.query('ROLLBACK');
        throw error;
      }

      copied += BigInt(batch.rows.length);
      const sectionTotal = sectionEnd - offset;
      if (copied % BigInt(effectiveBatchSize * 10) === 0n || copied === sectionTotal) {
        console.log(`  copied section ${copied.toString()}/${sectionTotal.toString()}`);
      }
    }

    await source.query(`CLOSE ${qIdent(cursorName)}`);
    await source.query('COMMIT');
  } catch (error) {
    await source.query('ROLLBACK').catch(() => {});
    throw error;
  }

  await resetSequences(target, table, columns);
  return { table, sourceCount, targetCount: await countRows(target, table) };
}

async function resetSequences(target, table, columns) {
  for (const column of columns) {
    const seqResult = await target.query('SELECT pg_get_serial_sequence($1, $2) AS seq', [`public.${table}`, column.name]);
    const sequenceName = seqResult.rows[0]?.seq;
    if (!sequenceName) continue;

    await target.query(
      `SELECT setval($1::regclass, COALESCE((SELECT MAX(${qIdent(column.name)}) FROM ${qTable('public', table)}), 1), (SELECT COUNT(*) > 0 FROM ${qTable('public', table)}))`,
      [sequenceName],
    );
  }
}

async function summary() {
  const connections = getConnections();
  console.log('Source:', connections.sourceSummary);
  console.log('Target:', connections.targetSummary);
}

function pushSchema() {
  const connections = getConnections();
  console.log('Pushing schema to target:', connections.targetSummary);
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm.cmd run db:push']
    : ['run', 'db:push'];
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: connections.targetUrl,
    },
  });

  if (result.status !== 0) {
    if (result.error) {
      throw new Error(`Schema push failed to start: ${result.error.message}`);
    }
    throw new Error(`Schema push failed with exit code ${result.status}`);
  }
}

async function copyData() {
  const connections = getConnections();
  console.log('Copying table data');
  console.log('Source:', connections.sourceSummary);
  console.log('Target:', connections.targetSummary);

  const source = new Client(clientConfig(connections.sourceUrl));
  const target = new Client(clientConfig(connections.targetUrl));
  await source.connect();
  await target.connect();

  try {
    const sourceTables = await getTables(source);
    const targetTables = new Set(await getTables(target));
    const missing = sourceTables.filter((table) => !targetTables.has(table));
    if (missing.length) {
      throw new Error(`Target is missing ${missing.length} public tables after schema push: ${missing.join(', ')}`);
    }

    const orderedTables = await getOrderedTables(source, sourceTables);
    const results = [];
    for (const table of orderedTables) {
      results.push(await copyTable(source, target, table));
    }

    const mismatches = results.filter((row) => row.sourceCount !== row.targetCount);
    if (mismatches.length) {
      console.log('Count mismatches:');
      for (const row of mismatches) {
        console.log(`- ${row.table}: source=${row.sourceCount.toString()} target=${row.targetCount.toString()}`);
      }
      throw new Error('Transfer finished with count mismatches');
    }

    console.log(`Transfer complete: ${results.length} tables matched source row counts.`);
  } finally {
    await source.end().catch(() => {});
    await target.end().catch(() => {});
  }
}

async function resetTargetData() {
  const connections = getConnections();
  const target = new Client(clientConfig(connections.targetUrl));
  await target.connect();

  try {
    const tables = await getTables(target);
    if (!tables.length) {
      console.log('Target has no public tables to truncate.');
      return;
    }

    console.log(`Truncating ${tables.length} target public table(s) with RESTART IDENTITY CASCADE`);
    await target.query(`TRUNCATE TABLE ${tables.map((table) => qTable('public', table)).join(', ')} RESTART IDENTITY CASCADE`);
    console.log('Target public tables truncated.');
  } finally {
    await target.end().catch(() => {});
  }
}

async function resetOneTargetTable() {
  const table = process.argv[3];
  if (!table) throw new Error('Usage: node table-transfer-env.cjs reset-table <table>');

  const connections = getConnections();
  const target = new Client(clientConfig(connections.targetUrl));
  await target.connect();

  try {
    const targetTables = new Set(await getTables(target));
    if (!targetTables.has(table)) throw new Error(`Target table not found: ${table}`);

    console.log(`Truncating target public.${table} with RESTART IDENTITY CASCADE`);
    await target.query(`TRUNCATE TABLE ${qTable('public', table)} RESTART IDENTITY CASCADE`);
    console.log(`Target public.${table} truncated.`);
  } finally {
    await target.end().catch(() => {});
  }
}

async function getCountRows(source, target) {
  const sourceTables = await getOrderedTables(source, await getTables(source));
  const targetTables = new Set(await getTables(target));
  const rows = [];

  for (const table of sourceTables) {
    if (!targetTables.has(table)) {
      rows.push({ table, sourceCount: await countRows(source, table), targetCount: null });
      continue;
    }

    rows.push({
      table,
      sourceCount: await countRows(source, table),
      targetCount: await countRows(target, table),
    });
  }

  return rows;
}

async function resetMismatchedTargetData() {
  const connections = getConnections();
  const source = new Client(clientConfig(connections.sourceUrl));
  const target = new Client(clientConfig(connections.targetUrl));
  await source.connect();
  await target.connect();

  try {
    const rows = await getCountRows(source, target);
    const mismatchedTables = rows
      .filter((row) => row.targetCount !== null && row.sourceCount !== row.targetCount)
      .map((row) => row.table);

    if (!mismatchedTables.length) {
      console.log('No mismatched target public tables to truncate.');
      return;
    }

    console.log(`Truncating ${mismatchedTables.length} mismatched target public table(s): ${mismatchedTables.join(', ')}`);
    await target.query(`TRUNCATE TABLE ${mismatchedTables.map((table) => qTable('public', table)).join(', ')} RESTART IDENTITY CASCADE`);
    console.log('Mismatched target public tables truncated.');
  } finally {
    await source.end().catch(() => {});
    await target.end().catch(() => {});
  }
}

async function copyNextSection() {
  const connections = getConnections();
  console.log(`Copying next mismatched section, max rows=${SECTION_LIMIT}`);
  const skipTables = getSkipTables();
  if (skipTables.size) {
    console.log(`Skipping for now: ${[...skipTables].join(', ')}`);
  }
  const source = new Client(clientConfig(connections.sourceUrl));
  const target = new Client(clientConfig(connections.targetUrl));
  await source.connect();
  await target.connect();

  try {
    const rows = await getCountRows(source, target);
    const next = rows.find((row) =>
      row.targetCount !== null &&
      row.sourceCount !== row.targetCount &&
      !skipTables.has(row.table)
    );
    if (!next) {
      console.log('No non-skipped mismatched public tables remain.');
      return;
    }

    if (next.targetCount > next.sourceCount) {
      console.log(`- ${next.table}: target has more rows than source; truncating table before section copy`);
      await target.query(`TRUNCATE TABLE ${qTable('public', next.table)} RESTART IDENTITY CASCADE`);
      next.targetCount = 0n;
    }

    console.log(`- next table ${next.table}: source=${next.sourceCount.toString()} target=${next.targetCount.toString()}`);
    const copyOptions = {
      offset: next.targetCount,
      limit: SECTION_LIMIT,
    };
    if (next.table === 'bot_activities') {
      copyOptions.resumeColumn = 'id';
      copyOptions.resumeAfter = await getMaxColumnValue(target, next.table, 'id');
      if (copyOptions.resumeAfter !== null && copyOptions.resumeAfter !== undefined) {
        console.log(`  resuming after id=${copyOptions.resumeAfter}`);
      }
    }

    await copyTable(source, target, next.table, {
      ...copyOptions,
    });

    const after = await countRows(target, next.table);
    console.log(`- ${next.table}: after section target=${after.toString()} source=${next.sourceCount.toString()}`);
  } finally {
    await source.end().catch(() => {});
    await target.end().catch(() => {});
  }
}

async function verifyCounts() {
  const connections = getConnections();
  const source = new Client(clientConfig(connections.sourceUrl));
  const target = new Client(clientConfig(connections.targetUrl));
  await source.connect();
  await target.connect();

  try {
    const rows = await getCountRows(source, target);
    const mismatches = [];
    for (const row of rows) {
      const targetCount = row.targetCount === null ? 'missing' : row.targetCount.toString();
      if (row.table === 'bot_activities' && row.targetCount !== null) {
        const oldTargetRows = await countExcludedBotActivities(target);
        console.log(`- ${row.table}: source_last_${BOT_ACTIVITIES_DAYS}_days=${row.sourceCount.toString()} target_last_${BOT_ACTIVITIES_DAYS}_days=${targetCount} target_older=${oldTargetRows.toString()}`);
        if (oldTargetRows > 0n) mismatches.push(row.table);
        if (row.sourceCount !== row.targetCount) mismatches.push(row.table);
        continue;
      }

      console.log(`- ${row.table}: source=${row.sourceCount.toString()} target=${targetCount}`);
      if (row.sourceCount !== row.targetCount) mismatches.push(row.table);
    }
    if (mismatches.length) throw new Error(`Count mismatches: ${mismatches.join(', ')}`);
    console.log(`Verified ${rows.length} public tables.`);
  } finally {
    await source.end().catch(() => {});
    await target.end().catch(() => {});
  }
}

async function checkTargetAuth() {
  const candidates = getTargetCandidates();
  console.log(`Testing ${candidates.length} target credential candidate(s)`);

  for (const candidate of candidates) {
    if (candidate.error) {
      console.log(`- ${candidate.label}: skipped (${candidate.error.message})`);
      continue;
    }

    const summary = redactUrl(candidate.connectionString);
    const client = new Client(clientConfig(candidate.connectionString));
    try {
      await client.connect();
      const result = await client.query('SELECT current_user AS current_user, current_database() AS current_database');
      console.log(`- ${candidate.label}: ok`, {
        ...summary,
        currentUser: result.rows[0].current_user,
        currentDatabase: result.rows[0].current_database,
      });
    } catch (error) {
      console.log(`- ${candidate.label}: failed`, {
        ...summary,
        code: error.code || 'unknown',
        message: error.message,
      });
    } finally {
      await client.end().catch(() => {});
    }
  }
}

async function main() {
  const command = process.argv[2] || 'summary';
  if (command === 'summary') return summary();
  if (command === 'push-schema') return pushSchema();
  if (command === 'check-target-auth') return checkTargetAuth();
  if (command === 'describe-table') return describeTable();
  if (command === 'copy-data') return copyData();
  if (command === 'reset-target') return resetTargetData();
  if (command === 'reset-table') return resetOneTargetTable();
  if (command === 'reset-mismatched') return resetMismatchedTargetData();
  if (command === 'copy-next-section') return copyNextSection();
  if (command === 'verify-counts') return verifyCounts();
  if (command === 'all') {
    summary();
    pushSchema();
    await copyData();
    await verifyCounts();
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
