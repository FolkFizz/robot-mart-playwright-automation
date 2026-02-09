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
  'ALL_PROXY', 'all_proxy',
  'HTTP_PROXY', 'http_proxy',
  'HTTPS_PROXY', 'https_proxy',
];

const deadLocalProxyPattern = /^https?:\/\/(127\.0\.0\.1|localhost):9\/?$/i;

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

const k6 = spawn('k6', ['run', ...args], {
  stdio: 'inherit',
  shell: true,
  env: buildK6Env(process.env),
});

k6.on('close', (code) => {
  if (code !== 0) {
    console.error(`k6 process exited with code ${code}`);
    process.exit(code);
  } else {
    console.log('Performance test completed successfully.');
  }
});
