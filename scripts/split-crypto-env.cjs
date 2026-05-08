const fs = require('fs');
const path = require('path');

const root = process.env.TRANSFER_ROOT;
if (!root) throw new Error('TRANSFER_ROOT is required');

const envPath = path.join(root, '.env.local');
const examplePath = path.join(root, '.env.example');

function parseVar(line) {
  const match = line.match(/^(\s*#\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) return null;
  return {
    commented: Boolean(match[1]),
    key: match[2],
    rawValue: match[3],
  };
}

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function quote(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
const vars = [];
const seen = new Set();
for (const line of lines) {
  const parsed = parseVar(line);
  if (!parsed) continue;
  if (seen.has(parsed.key)) continue;
  seen.add(parsed.key);
  vars.push(parsed);
}

const groups = {
  frontend: new Set([
    'VITE_API_URL',
    'VITE_WS_URL',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_DEFAULT_LOGIN_EMAIL',
    'VITE_DEFAULT_LOGIN_PASSWORD',
    'VITE_AUTO_LOGIN_DEFAULT_ADMIN',
  ]),
  db: new Set([
    'DATABASE_URL',
    'PGPASSWORD',
    'POSTGRES_PASSWORD',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_DB_PASSWORD',
    'SUPABASE_JWT_SECRET',
    'SUPABASE_JWK',
    'SUPABASE_PROJECT_ID',
    'SUPABASE_PROJECT_NAME',
    'SUPABASE_REST_URL',
    'JWKS_URL',
  ]),
  redis: new Set([
    'REDIS_URL',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'UPSTASH_ENDPOINT',
    'UPSTASH_TOKEN',
  ]),
  backend: new Set([
    'NODE_ENV',
    'NODE_OPTIONS',
    'PORT',
    'APP_URL',
    'SERVER_BASE_URL',
    'DEPLOYMENT_URL',
    'ADDITIONAL_ALLOWED_ORIGINS',
    'ADMIN_SECRET',
    'ADMIN_SEED_EMAIL',
    'ADMIN_SEED_PASSWORD',
    'ADMIN_SEED_USERNAME',
    'ENCRYPTION_KEY',
    'JWT_SECRET',
    'PUBLISH_DEBOUNCE_MS',
    'MARKET_SLEEP_MODE',
    'MARKET_OPEN',
    'MARKET_CLOSE',
    'MARKET_DAYS',
    'MARKET_TZ_OFFSET_MINUTES',
    'MARKET_PREWARM_MINUTES',
    'BINANCE_API_BASE_URL',
    'BINANCE_API_KEY',
    'BINANCE_API_SECRET',
    'TWELVE_DATA_API_KEY',
    'TWELVE_DATA_API_KEY_SECONDARY',
    'TWELVE_DATA_ROTATION_WINDOW_MS',
    'TWELVE_DATA_ROTATION_BATCH_SIZE',
    'TWELVE_DATA_MAX_REQUESTS_PER_MINUTE',
    'GROQ_AI_KEY',
    'LETS_SHOP_API_BASE_URL',
    'LETS_SHOP_VOUCHER_ISSUE_ENDPOINT',
    'LETS_SHOP_VOUCHER_STATUS_ENDPOINT_TEMPLATE',
    'LETS_SHOP_VOUCHER_REDEEM_ENDPOINT',
    'LETS_SHOP_ACCESS_SYNC_ENDPOINT',
    'LETS_SHOP_API_KEY_HEADER_NAME',
    'LETS_SHOP_API_KEY',
    'LETS_TRADE_API_URL',
    'LETS_TRADE_ACCESS_SYNC_ENDPOINT',
    'LETS_TRADE_API_KEY',
    'VOUCHER_PROVIDER_NAME',
    'VOUCHER_PROVIDER_API_KEYS',
    'STRATEGY_SHOP_API_KEYS',
  ]),
};

function targetFileFor(key) {
  for (const [name, set] of Object.entries(groups)) {
    if (set.has(key)) return name;
  }
  return 'other';
}

function writeSplitFile(name, title, items) {
  const out = [
    `# ${title}`,
    '# Generated from .env.local. Keep .env.local as the combined root file.',
    '',
  ];
  for (const item of items) {
    const prefix = item.commented ? '# ' : '';
    out.push(`${prefix}${item.key}=${item.rawValue}`);
  }
  fs.writeFileSync(path.join(root, `.env.${name}`), `${out.join('\n').replace(/\n+$/, '')}\n`, 'utf8');
}

const buckets = {
  frontend: [],
  backend: [],
  db: [],
  redis: [],
  other: [],
};

for (const item of vars) {
  buckets[targetFileFor(item.key)].push(item);
}

writeSplitFile('frontend', 'Frontend env', buckets.frontend);
writeSplitFile('backend', 'Backend/runtime env', buckets.backend);
writeSplitFile('db', 'Database and Supabase env', buckets.db);
writeSplitFile('redis', 'Redis env', buckets.redis);
writeSplitFile('other', 'Other, deployment, and local test env', buckets.other);

function placeholderFor(item) {
  const key = item.key;
  const value = stripQuotes(item.rawValue);
  if (key.startsWith('TEST_')) return quote('');
  if (key.includes('URL') || key.includes('ENDPOINT') || key === 'APP_URL' || key === 'SERVER_BASE_URL') {
    if (key === 'DATABASE_URL') return quote('postgresql://postgres:<password>@<host>:6543/postgres?sslmode=require');
    if (key === 'REDIS_URL') return quote('rediss://default:<token>@<host>:6379');
    if (key.includes('SUPABASE') || key === 'JWKS_URL') return quote(value.replace(/https:\/\/[^/]+/, 'https://<project-ref>.supabase.co'));
    if (key.includes('UPSTASH')) return quote('https://<upstash-rest-host>');
    return quote(value || 'https://example.com');
  }
  if (key.includes('EMAIL')) return quote('admin@example.com');
  if (key.includes('PASSWORD') || key.includes('SECRET') || key.includes('TOKEN') || key.includes('KEY')) return quote('<set-value>');
  if (key === 'SUPABASE_JWK') return quote('{"kid":"<key-id>","kty":"EC","alg":"ES256"}');
  if (key === 'SUPABASE_PROJECT_ID') return quote('<project-ref>');
  if (key === 'SUPABASE_PROJECT_NAME') return quote('<project-name>');
  if (key === 'PORT') return value || '3001';
  if (key.startsWith('MARKET_') || key.includes('WINDOW_MS') || key.includes('BATCH_SIZE') || key.includes('MAX_REQUESTS')) return value || '0';
  if (key.startsWith('VITE_AUTO_LOGIN')) return value || 'false';
  return quote(value || '');
}

const exampleOut = [
  '# Env example for Crypto-bot-2',
  '# Copy needed values into .env.local. Do not commit real secrets.',
  '',
];
const sectionOrder = [
  ['frontend', 'Frontend'],
  ['backend', 'Backend/runtime'],
  ['db', 'Database and Supabase'],
  ['redis', 'Redis'],
  ['other', 'Other, deployment, and local tests'],
];
for (const [bucket, title] of sectionOrder) {
  exampleOut.push(`# ${title}`);
  for (const item of buckets[bucket]) {
    const prefix = item.commented ? '# ' : '';
    exampleOut.push(`${prefix}${item.key}=${placeholderFor(item)}`);
  }
  exampleOut.push('');
}

fs.writeFileSync(examplePath, `${exampleOut.join('\n').replace(/\n+$/, '')}\n`, 'utf8');

const summary = Object.fromEntries(Object.entries(buckets).map(([key, items]) => [key, items.length]));
console.log(`wrote split env files and .env.example; counts=${JSON.stringify(summary)}`);
