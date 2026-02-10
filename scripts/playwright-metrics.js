const fs = require('fs');
const path = require('path');

const parseArg = (flag, fallback) => {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || !process.argv[idx + 1]) return fallback;
  return process.argv[idx + 1];
};

const parsePositionalInput = () => {
  const positional = process.argv.slice(2).find((arg) => !arg.startsWith('-'));
  return positional || '';
};

const inputPath = path.resolve(
  process.cwd(),
  parseArg('--input', parsePositionalInput() || path.join('test-results', 'quick-regression.json'))
);

if (!fs.existsSync(inputPath)) {
  console.error(`[metrics] Playwright JSON report not found: ${inputPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, '');
const report = JSON.parse(raw);
const stats = report.stats || {};

const collectDurations = (suite, acc) => {
  for (const child of suite.suites || []) {
    collectDurations(child, acc);
  }

  for (const spec of suite.specs || []) {
    for (const test of spec.tests || []) {
      const results = test.results || [];
      const lastResult = results[results.length - 1];
      if (!lastResult) continue;
      if (lastResult.status === 'skipped') continue;
      const duration = Number(lastResult.duration);
      if (!Number.isNaN(duration) && duration >= 0) {
        acc.push(duration);
      }
    }
  }
};

const durationsMs = [];
for (const suite of report.suites || []) {
  collectDurations(suite, durationsMs);
}

durationsMs.sort((a, b) => a - b);
const p95Index = durationsMs.length > 0 ? Math.ceil(durationsMs.length * 0.95) - 1 : -1;
const p95Ms = p95Index >= 0 ? durationsMs[p95Index] : 0;

const expected = Number(stats.expected || 0);
const unexpected = Number(stats.unexpected || 0);
const flaky = Number(stats.flaky || 0);
const skipped = Number(stats.skipped || 0);
const executed = expected + unexpected + flaky;
const passRate = executed > 0 ? (expected / executed) * 100 : 0;
const flakeRate = executed > 0 ? (flaky / executed) * 100 : 0;
const avgRuntimeSec = executed > 0 ? Number(stats.duration || 0) / 1000 / executed : 0;

const summary = {
  inputPath,
  expected,
  unexpected,
  flaky,
  skipped,
  executed,
  passRatePct: Number(passRate.toFixed(2)),
  flakeRatePct: Number(flakeRate.toFixed(2)),
  avgRuntimeSec: Number(avgRuntimeSec.toFixed(2)),
  p95Sec: Number((p95Ms / 1000).toFixed(2))
};

console.log('[metrics] Playwright health summary');
console.log(JSON.stringify(summary, null, 2));
