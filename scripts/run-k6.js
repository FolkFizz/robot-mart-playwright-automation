const { spawn } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env');
const loadResult = dotenv.config({ path: envPath });

if (loadResult.error) {
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

const TARGET_PRIORITY = [
  ['K6_BASE_URL', 'K6_BASE_URL'],
  ['APP_BASE_URL', 'APP_BASE_URL'],
  ['BASE_URL', 'BASE_URL (legacy)'],
  ['PERF_BASE_URL', 'PERF_BASE_URL (legacy)'],
  ['REAL_URL', 'REAL_URL (legacy)']
];

const PROXY_KEYS = [
  'ALL_PROXY',
  'all_proxy',
  'HTTP_PROXY',
  'http_proxy',
  'HTTPS_PROXY',
  'https_proxy'
];

const DEAD_LOCAL_PROXY_PATTERN = /^https?:\/\/(127\.0\.0\.1|localhost):9\/?$/i;

const readTrimmed = (env, key) => String(env[key] || '').trim();

const resolveK6Target = (env) => {
  for (const [key, source] of TARGET_PRIORITY) {
    const value = readTrimmed(env, key);
    if (value) return { url: value, source };
  }
  return { url: 'http://localhost:3000', source: 'default' };
};

const buildK6Env = (baseEnv) => {
  const env = { ...baseEnv };
  const keepProxy = readTrimmed(env, 'K6_KEEP_PROXY').toLowerCase() === 'true';

  if (keepProxy) return env;

  for (const key of PROXY_KEYS) {
    if (DEAD_LOCAL_PROXY_PATTERN.test(readTrimmed(env, key))) {
      delete env[key];
    }
  }

  return env;
};

const hasExplicitOutArg = (argv) => {
  return argv.includes('--out') || argv.some((arg) => String(arg).startsWith('--out='));
};

const target = resolveK6Target(process.env);
console.log(`[run-k6] Target URL: ${target.url} (source=${target.source})`);
if (target.source.includes('(legacy)')) {
  console.warn(
    '[run-k6] Legacy target env var detected. Prefer K6_BASE_URL (or APP_BASE_URL shared with Playwright).'
  );
}

const k6Out = readTrimmed(process.env, 'K6_OUT');
const k6Args = ['run'];

if (!hasExplicitOutArg(args) && k6Out) {
  k6Args.push('--out', k6Out);
  console.log(`[run-k6] Output sink: ${k6Out} (source=K6_OUT)`);
}

if (k6Out.includes('prometheus-rw')) {
  const trendStats = readTrimmed(process.env, 'K6_PROMETHEUS_RW_TREND_STATS');
  if (trendStats) {
    console.log(`[run-k6] Prometheus trend stats: ${trendStats}`);
  }
}

k6Args.push(...args);

const k6 = spawn('k6', k6Args, {
  stdio: 'inherit',
  shell: true,
  env: buildK6Env(process.env)
});

k6.on('close', (code) => {
  if (code !== 0) {
    console.error(`k6 process exited with code ${code}`);
    process.exit(code);
  }
  console.log('Performance test completed successfully.');
});
