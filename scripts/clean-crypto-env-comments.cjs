const fs = require('fs');
const path = require('path');

const root = process.env.TRANSFER_ROOT;
if (!root) throw new Error('TRANSFER_ROOT is required');

const envPath = path.join(root, '.env.local');
const subPath = path.join(root, '.env.sub');

const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);

function parseVar(line) {
  const match = line.match(/^(\s*#\s*)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) return null;
  return {
    commented: Boolean(match[1]),
    key: match[2],
    rawValue: match[3],
    value: stripQuotes(match[3].trim()),
  };
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function quote(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function findActiveValue(key) {
  for (const line of lines) {
    const parsed = parseVar(line);
    if (parsed && !parsed.commented && parsed.key === key) return parsed.value;
  }
  return '';
}

function findAnyValue(key) {
  for (const line of lines) {
    const parsed = parseVar(line);
    if (parsed && parsed.key === key) return parsed.value;
  }
  return '';
}

const sharedKey =
  findActiveValue('VOUCHER_PROVIDER_API_KEYS') ||
  findActiveValue('STRATEGY_SHOP_API_KEYS') ||
  findAnyValue('LETS_SHOP_API_KEY') ||
  findAnyValue('LETS_TRADE_API_KEY');

if (!sharedKey) throw new Error('No shared Lets Shop key found in .env.local');

const providerName = findActiveValue('VOUCHER_PROVIDER_NAME') || 'lets_shop';
const baseUrl = 'https://crypto-bot-2-production.up.railway.app';
const letsShopValues = {
  LETS_SHOP_API_BASE_URL: baseUrl,
  LETS_SHOP_VOUCHER_ISSUE_ENDPOINT: `${baseUrl}/api/vouchers/issue`,
  LETS_SHOP_VOUCHER_STATUS_ENDPOINT_TEMPLATE: `${baseUrl}/api/vouchers/:code/status`,
  LETS_SHOP_VOUCHER_REDEEM_ENDPOINT: `${baseUrl}/api/users/voucher/redeem`,
  LETS_SHOP_ACCESS_SYNC_ENDPOINT: `${baseUrl}/api/shop/access/sync`,
  LETS_TRADE_ACCESS_SYNC_ENDPOINT: `${baseUrl}/api/shop/access/sync`,
  LETS_SHOP_API_KEY_HEADER_NAME: 'x-api-key',
  LETS_SHOP_API_KEY: sharedKey,
  VOUCHER_PROVIDER_NAME: providerName,
  VOUCHER_PROVIDER_API_KEYS: sharedKey,
  STRATEGY_SHOP_API_KEYS: sharedKey,
  LETS_TRADE_API_URL: `${baseUrl}/api/vouchers/issue`,
  LETS_TRADE_API_KEY: sharedKey,
};

const letsShopKeys = new Set(Object.keys(letsShopValues));
const localLines = [];
const movedCommentedVars = [];

for (const line of lines) {
  const parsed = parseVar(line);
  if (!parsed) {
    localLines.push(line);
    continue;
  }

  if (parsed.commented) {
    if (parsed.key.startsWith('TEST_')) {
      localLines.push(line);
    } else {
      movedCommentedVars.push(line);
    }
    continue;
  }

  if (letsShopKeys.has(parsed.key)) continue;
  localLines.push(line);
}

localLines.push('');
localLines.push('# Active Lets Shop integration values');
for (const [key, value] of Object.entries(letsShopValues)) {
  localLines.push(`${key}=${quote(value)}`);
}

const subLines = [
  '# Inactive/commented env vars moved out of .env.local',
  '# Created by Codex cleanup; values remain commented for reference.',
  '',
  ...movedCommentedVars,
  '',
];

fs.writeFileSync(envPath, `${localLines.join('\n').replace(/\n+$/, '')}\n`, 'utf8');
fs.writeFileSync(subPath, `${subLines.join('\n').replace(/\n+$/, '')}\n`, 'utf8');
console.log(`cleaned .env.local and wrote ${movedCommentedVars.length} commented vars to .env.sub`);
