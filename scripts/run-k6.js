const { spawn } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('Warning: .env file not found or could not be loaded.');
} else {
  console.log('Loaded environment variables from .env');
}

const args = process.argv.slice(2);
const scriptFile = args[0];

if (!scriptFile) {
  console.error('Error: Please specify a k6 script to run.');
  process.exit(1);
}

const proxyKeys = [
  'ALL_PROXY',
  'all_proxy',
  'HTTP_PROXY',
  'http_proxy',
  'HTTPS_PROXY',
  'https_proxy'
];

const deadLocalProxyPattern = /^https?:\/\/(127\.0\.0\.1|localhost):9\/?$/i;

function resolveK6Target(env) {
  if (env.PERF_BASE_URL && String(env.PERF_BASE_URL).trim()) {
    return { url: String(env.PERF_BASE_URL).trim(), source: 'PERF_BASE_URL' };
  }
  if (env.REAL_URL && String(env.REAL_URL).trim()) {
    return { url: String(env.REAL_URL).trim(), source: 'REAL_URL (legacy)' };
  }
  if (env.BASE_URL && String(env.BASE_URL).trim()) {
    return { url: String(env.BASE_URL).trim(), source: 'BASE_URL' };
  }
  return { url: 'http://localhost:3000', source: 'default' };
}

function buildK6Env(baseEnv) {
  const env = { ...baseEnv };
  const keepProxy = String(env.K6_KEEP_PROXY || 'false').toLowerCase() === 'true';

  if (keepProxy) {
    return env;
  }

  for (const key of proxyKeys) {
    const value = String(env[key] || '').trim();
    if (deadLocalProxyPattern.test(value)) {
      delete env[key];
    }
  }

  return env;
}

const target = resolveK6Target(process.env);
console.log(`[run-k6] Target URL: ${target.url} (source=${target.source})`);
if (target.source === 'REAL_URL (legacy)') {
  console.warn(
    '[run-k6] REAL_URL is legacy. Prefer PERF_BASE_URL for clarity in shared repositories.'
  );
}

const k6 = spawn('k6', ['run', ...args], {
  stdio: 'inherit',
  shell: true,
  env: buildK6Env(process.env)
});

k6.on('close', (code) => {
  if (code !== 0) {
    console.error(`k6 process exited with code ${code}`);
    process.exit(code);
  } else {
    console.log('Performance test completed successfully.');
  }
});
