const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function pick(key) {
  const value = process.env[key];
  return value && String(value).trim().length > 0 ? String(value).trim() : '';
}

function resolvePlaywrightTarget() {
  return {
    url: pick('BASE_URL') || 'http://localhost:3000',
    source: pick('BASE_URL') ? 'BASE_URL' : 'default'
  };
}

function resolveK6Target() {
  const perfBaseUrl = pick('PERF_BASE_URL');
  if (perfBaseUrl) return { url: perfBaseUrl, source: 'PERF_BASE_URL' };

  const realUrl = pick('REAL_URL');
  if (realUrl) return { url: realUrl, source: 'REAL_URL (legacy)' };

  const baseUrl = pick('BASE_URL');
  if (baseUrl) return { url: baseUrl, source: 'BASE_URL' };

  return { url: 'http://localhost:3000', source: 'default' };
}

const pw = resolvePlaywrightTarget();
const k6 = resolveK6Target();
const seedData = pick('SEED_DATA') || 'true';
const destructiveOverride = pick('ALLOW_DESTRUCTIVE_TEST_HOOKS') || 'false';

console.log('Resolved test targets');
console.log(`- Playwright: ${pw.url} (source=${pw.source})`);
console.log(`- k6:         ${k6.url} (source=${k6.source})`);
console.log(`- SEED_DATA:  ${seedData}`);
console.log(`- DESTRUCTIVE_HOOK_OVERRIDE: ${destructiveOverride}`);

if (k6.source === 'REAL_URL (legacy)') {
  console.log('- Note: switch to PERF_BASE_URL to make k6 override explicit.');
}
