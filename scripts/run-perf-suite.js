const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RESULTS_ROOT = path.join(ROOT, 'performance', 'results');
const RESET_STOCK_ENV = {
  PERF_RESET_STOCK: 'true',
  PERF_STOCK_ALL: process.env.PERF_STOCK_ALL || '300'
};

const PROFILES = {
  portfolio: [
    { id: 'smoke', script: 'performance/scripts/smoke.k6.js' },
    { id: 'auth', script: 'performance/scripts/auth.k6.js' },
    { id: 'browse', script: 'performance/scripts/browse.k6.js' },
    { id: 'cart', script: 'performance/scripts/cart.k6.js', env: { ...RESET_STOCK_ENV } },
    { id: 'race', script: 'performance/scripts/race-condition.k6.js', env: { ...RESET_STOCK_ENV } },
    {
      id: 'checkout-acceptance',
      script: 'performance/scripts/checkout.k6.js',
      env: { ...RESET_STOCK_ENV, CHECKOUT_MODE: 'acceptance' }
    },
    {
      id: 'load-acceptance',
      script: 'performance/scripts/load.k6.js',
      env: { ...RESET_STOCK_ENV, TEST_MODE: 'acceptance' }
    },
    {
      id: 'stress-quick',
      script: 'performance/scripts/stress.k6.js',
      env: { ...RESET_STOCK_ENV, STRESS_QUICK: 'true' }
    },
    {
      id: 'soak-quick',
      script: 'performance/scripts/soak.k6.js',
      env: { ...RESET_STOCK_ENV, SOAK_QUICK: 'true' }
    },
    { id: 'breakpoint', script: 'performance/scripts/breakpoint.k6.js' }
  ],
  gate: [
    { id: 'smoke', script: 'performance/scripts/smoke.k6.js' },
    { id: 'auth', script: 'performance/scripts/auth.k6.js' },
    { id: 'browse', script: 'performance/scripts/browse.k6.js' },
    { id: 'cart', script: 'performance/scripts/cart.k6.js', env: { ...RESET_STOCK_ENV } },
    { id: 'race', script: 'performance/scripts/race-condition.k6.js', env: { ...RESET_STOCK_ENV } },
    {
      id: 'checkout-strict',
      script: 'performance/scripts/checkout.k6.js',
      env: { ...RESET_STOCK_ENV }
    },
    { id: 'load-balanced', script: 'performance/scripts/load.k6.js', env: { ...RESET_STOCK_ENV } },
    {
      id: 'stress-quick',
      script: 'performance/scripts/stress.k6.js',
      env: { ...RESET_STOCK_ENV, STRESS_QUICK: 'true' }
    },
    {
      id: 'soak-quick',
      script: 'performance/scripts/soak.k6.js',
      env: { ...RESET_STOCK_ENV, SOAK_QUICK: 'true' }
    },
    { id: 'breakpoint', script: 'performance/scripts/breakpoint.k6.js' }
  ]
};

function parseArgs(argv) {
  const args = { profile: 'portfolio' };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--profile' && argv[i + 1]) {
      args.profile = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function timestamp() {
  const now = new Date();
  const y = String(now.getFullYear());
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

function fmtNumber(value, digits = 2) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '-';
  }
  return value.toFixed(digits);
}

function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_error) {
    return null;
  }
}

function extractSummaryMetrics(summary) {
  if (!summary || !summary.metrics) {
    return {
      httpReqFailedRate: null,
      httpReqDurationP95: null,
      iterations: null,
      requests: null,
      checkFailCount: null
    };
  }

  const metrics = summary.metrics;
  const httpReqFailedRate =
    metrics.http_req_failed && typeof metrics.http_req_failed.value === 'number'
      ? metrics.http_req_failed.value
      : null;
  const httpReqDurationP95 =
    metrics.http_req_duration && typeof metrics.http_req_duration['p(95)'] === 'number'
      ? metrics.http_req_duration['p(95)']
      : null;
  const iterations =
    metrics.iterations && typeof metrics.iterations.count === 'number'
      ? metrics.iterations.count
      : null;
  const requests =
    metrics.http_reqs && typeof metrics.http_reqs.count === 'number'
      ? metrics.http_reqs.count
      : null;
  const checkFailCount =
    metrics.checks && typeof metrics.checks.fails === 'number' ? metrics.checks.fails : null;

  return {
    httpReqFailedRate,
    httpReqDurationP95,
    iterations,
    requests,
    checkFailCount
  };
}

function writeManifestMarkdown(outputPath, manifest) {
  const lines = [];
  lines.push('# Performance Suite Manifest');
  lines.push('');
  lines.push(`- Profile: \`${manifest.profile}\``);
  lines.push(`- Started: \`${manifest.startedAt}\``);
  lines.push(`- Finished: \`${manifest.finishedAt}\``);
  lines.push(`- Total runs: \`${manifest.totalRuns}\``);
  lines.push(`- Failed runs: \`${manifest.failedRuns}\``);
  lines.push(`- Result: \`${manifest.failedRuns === 0 ? 'PASS' : 'FAIL'}\``);
  lines.push('');
  lines.push(
    '| Run | Status | Exit | Duration (s) | http_req_failed | http_req_duration p95 (ms) | Iterations | Requests |'
  );
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');

  for (const run of manifest.runs) {
    lines.push(
      `| ${run.id} | ${run.status} | ${run.exitCode} | ${fmtNumber(run.durationMs / 1000, 1)} | ${fmtNumber(
        run.metrics.httpReqFailedRate,
        4
      )} | ${fmtNumber(run.metrics.httpReqDurationP95, 2)} | ${run.metrics.iterations ?? '-'} | ${run.metrics.requests ?? '-'} |`
    );
  }

  lines.push('');
  lines.push('## Files');
  lines.push('');
  for (const run of manifest.runs) {
    lines.push(`- ${run.id}: \`${run.summaryFile}\` | \`${run.logFile}\``);
  }
  lines.push('');

  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
}

function runOne(test, index, total, resultDir) {
  return new Promise((resolve) => {
    const summaryFileName = `${test.id}.summary.json`;
    const logFileName = `${test.id}.log.txt`;
    const summaryPath = path.join(resultDir, summaryFileName);
    const logPath = path.join(resultDir, logFileName);
    const logStream = fs.createWriteStream(logPath, { flags: 'w' });

    const env = { ...process.env, ...(test.env || {}) };
    const args = ['scripts/run-k6.js', test.script, '--summary-export', summaryPath];
    const startedAt = new Date();
    const startedMs = Date.now();

    const modeTags = Object.entries(test.env || {})
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    const header = `[${index}/${total}] ${test.id}\nScript: ${test.script}\nEnv: ${modeTags || 'default'}\nStarted: ${startedAt.toISOString()}\n\n`;
    process.stdout.write(`\n===== [${index}/${total}] ${test.id} =====\n`);
    logStream.write(header);

    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      logStream.write(chunk);
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
      logStream.write(chunk);
    });

    child.on('close', (code) => {
      const finishedMs = Date.now();
      const durationMs = finishedMs - startedMs;
      logStream.write(`\nExit code: ${code}\nDurationMs: ${durationMs}\n`);
      logStream.end();

      const summary = readJson(summaryPath);
      resolve({
        id: test.id,
        script: test.script,
        env: test.env || {},
        exitCode: typeof code === 'number' ? code : 1,
        status: code === 0 ? 'PASS' : 'FAIL',
        startedAt: startedAt.toISOString(),
        finishedAt: new Date(finishedMs).toISOString(),
        durationMs,
        summaryFile: summaryFileName,
        logFile: logFileName,
        metrics: extractSummaryMetrics(summary)
      });
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const tests = PROFILES[args.profile];

  if (!tests) {
    console.error(
      `Unknown profile "${args.profile}". Available: ${Object.keys(PROFILES).join(', ')}`
    );
    process.exit(1);
  }

  fs.mkdirSync(RESULTS_ROOT, { recursive: true });
  const runId = `${timestamp()}-${args.profile}`;
  const resultDir = path.join(RESULTS_ROOT, runId);
  fs.mkdirSync(resultDir, { recursive: true });

  const suiteStart = new Date();
  const runs = [];
  for (let i = 0; i < tests.length; i += 1) {
    // Keep running all tests even if one fails to collect full evidence.
    // This is useful for portfolio-style reporting.
    // eslint-disable-next-line no-await-in-loop
    const result = await runOne(tests[i], i + 1, tests.length, resultDir);
    runs.push(result);
  }

  const failedRuns = runs.filter((run) => run.exitCode !== 0).length;
  const manifest = {
    profile: args.profile,
    runId,
    startedAt: suiteStart.toISOString(),
    finishedAt: new Date().toISOString(),
    totalRuns: runs.length,
    failedRuns,
    runs
  };

  const manifestJsonPath = path.join(resultDir, 'manifest.json');
  const manifestMdPath = path.join(resultDir, 'manifest.md');
  fs.writeFileSync(manifestJsonPath, JSON.stringify(manifest, null, 2), 'utf8');
  writeManifestMarkdown(manifestMdPath, manifest);

  fs.writeFileSync(path.join(RESULTS_ROOT, 'latest.txt'), `${runId}\n`, 'utf8');

  console.log('\n========================================');
  console.log(`Perf suite finished: ${runId}`);
  console.log(`Result directory: ${path.relative(ROOT, resultDir)}`);
  console.log(`Failed runs: ${failedRuns}/${runs.length}`);
  console.log('========================================\n');

  process.exit(failedRuns === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
