const fs = require('fs');
const path = require('path');

const FAILED_STATUSES = new Set(['failed', 'timedOut', 'interrupted']);

const CATEGORY_ORDER = ['a11y', 'api', 'e2e', 'integration', 'security', 'performance', 'other'];
const PRIMARY_CATEGORIES = ['a11y', 'api', 'e2e', 'integration', 'security'];

const parseArg = (flag, fallback) => {
  const index = process.argv.indexOf(flag);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const normalizePath = (value) => (value || '').replace(/\\/g, '/');

const readJson = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
};

const escapeMd = (value) =>
  String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();

const stripTags = (title) => String(title ?? '').replace(/\s+@\S+/g, '').trim();

const normalizeTitle = (title) => String(title ?? '').replace(/\s+/g, ' ').trim();

const stripAnsi = (value) => String(value ?? '').replace(/\u001b\[[0-9;]*m/g, '');

const detectCategory = (filePath) => {
  const normalized = normalizePath(filePath);
  const matched = normalized.match(/(?:^|\/)tests\/([^/]+)/i);
  if (matched) return matched[1].toLowerCase();

  const firstSegment = normalized.split('/').filter(Boolean)[0]?.toLowerCase();
  if (firstSegment && CATEGORY_ORDER.includes(firstSegment)) {
    return firstSegment;
  }

  return 'other';
};

const classifyStatus = (status) => {
  if (status === 'passed') return 'passed';
  if (status === 'skipped') return 'skipped';
  if (FAILED_STATUSES.has(status)) return 'failed';
  return 'skipped';
};

const getErrorMessage = (lastResult) => {
  if (!lastResult) return '';
  if (lastResult.error && lastResult.error.message) {
    return stripAnsi(String(lastResult.error.message)).replace(/\s+/g, ' ').trim();
  }
  if (Array.isArray(lastResult.errors) && lastResult.errors.length > 0) {
    const msg = lastResult.errors.find((entry) => entry && entry.message)?.message;
    if (msg) return stripAnsi(String(msg)).replace(/\s+/g, ' ').trim();
  }
  return '';
};

const aggregateCounts = (records) => {
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const record of records) {
    const outcome = classifyStatus(record.status);
    if (outcome === 'passed') passed += 1;
    else if (outcome === 'failed') failed += 1;
    else skipped += 1;
  }

  const total = passed + failed + skipped;
  const executed = passed + failed;
  const passRate = executed > 0 ? (passed / executed) * 100 : 0;

  return {
    total,
    passed,
    failed,
    skipped,
    passRate
  };
};

const sortCategories = (categories) => {
  return [...categories].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    const aRank = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
    const bRank = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
    if (aRank !== bRank) return aRank - bRank;
    return a.localeCompare(b);
  });
};

const createKnownIssueResolver = (knownIssues) => {
  const normalizedMap = new Map();

  for (const [key, value] of Object.entries(knownIssues)) {
    normalizedMap.set(normalizeTitle(key), value);
    normalizedMap.set(normalizeTitle(stripTags(key)), value);
  }

  return (testName, fullTitle) => {
    const candidates = [
      normalizeTitle(testName),
      normalizeTitle(stripTags(testName)),
      normalizeTitle(fullTitle),
      normalizeTitle(stripTags(fullTitle))
    ];

    for (const candidate of candidates) {
      if (normalizedMap.has(candidate)) {
        return normalizedMap.get(candidate);
      }
    }

    return null;
  };
};

const reportPath = path.resolve(process.cwd(), parseArg('--input', 'test-results.json'));
const knownIssuesPath = path.resolve(process.cwd(), parseArg('--known', 'known-issues.json'));
const outputPath = path.resolve(process.cwd(), parseArg('--output', 'TEST_REPORT.md'));

if (!fs.existsSync(reportPath)) {
  console.error(`[report] Playwright JSON report not found: ${reportPath}`);
  console.error(
    '[report] Generate one first, for example: npx playwright test --reporter=json > test-results.json'
  );
  process.exit(1);
}

let knownIssues = {};
if (fs.existsSync(knownIssuesPath)) {
  knownIssues = readJson(knownIssuesPath);
} else {
  console.warn(`[report] known-issues file not found: ${knownIssuesPath}`);
  console.warn('[report] Continue with empty known-issues list.');
}

const report = readJson(reportPath);
const resolveKnownIssue = createKnownIssueResolver(knownIssues);
const testRecords = [];

// Walk the Playwright suite tree and flatten all executed test entries.
const collectRecords = (suite, parentTitles = [], inheritedFile = '') => {
  const title = String(suite.title || '').trim();
  const nextTitles = title ? [...parentTitles, title] : [...parentTitles];
  const suiteFile = suite.file || inheritedFile || '';

  for (const nested of suite.suites || []) {
    collectRecords(nested, nextTitles, suiteFile);
  }

  for (const spec of suite.specs || []) {
    const specTitle = String(spec.title || '').trim() || '(untitled test)';
    const specFile = normalizePath(spec.file || suiteFile || 'unknown');

    for (const test of spec.tests || []) {
      const results = Array.isArray(test.results) ? test.results : [];
      const lastResult = results.length > 0 ? results[results.length - 1] : null;
      const status = (lastResult && lastResult.status) || test.status || 'unknown';
      const projectName = test.projectName || 'unknown';

      testRecords.push({
        category: detectCategory(specFile),
        file: specFile,
        testName: specTitle,
        fullTitle: [...nextTitles, specTitle].filter(Boolean).join(' > '),
        projectName,
        status,
        errorMessage: getErrorMessage(lastResult)
      });
    }
  }
};

for (const suite of report.suites || []) {
  collectRecords(suite, [], '');
}

// Group flattened tests by category (a11y/api/e2e/...) for summary and details.
const byCategory = new Map();
for (const record of testRecords) {
  if (!byCategory.has(record.category)) byCategory.set(record.category, []);
  byCategory.get(record.category).push(record);
}

const categories = sortCategories([...byCategory.keys()]);
const extraCategories = categories.filter((category) => !PRIMARY_CATEGORIES.includes(category));
const reportCategories = [...PRIMARY_CATEGORIES, ...extraCategories];
const overall = aggregateCounts(testRecords);
const generatedAt = new Date();
const runStartedAt = report.stats && report.stats.startTime ? new Date(report.stats.startTime) : null;
const baseUrl =
  report.config?.use?.baseURL ||
  report.config?.projects?.[0]?.use?.baseURL ||
  process.env.APP_BASE_URL ||
  'N/A';

const lines = [];
lines.push('# TEST REPORT');
lines.push('');
lines.push(`Generated At: ${generatedAt.toISOString()}`);
lines.push(`Run Started At: ${runStartedAt ? runStartedAt.toISOString() : 'N/A'}`);
lines.push(`Environment: ${baseUrl}`);
lines.push('');
lines.push('## Table of Contents');
lines.push('');
lines.push('- [Section 1: Executive Summary](#section-1-executive-summary)');
lines.push('- [Section 2: Detail by Category](#section-2-detail-by-category)');
for (const category of reportCategories) {
  lines.push(`- [${category}](#${category})`);
}
lines.push('');
lines.push('## Section 1: Executive Summary');
lines.push('');
lines.push(
  `Overall: **${overall.passed}/${overall.passed + overall.failed} passed** (${overall.passRate.toFixed(
    2
  )}% pass rate, skipped: ${overall.skipped})`
);
lines.push('');
lines.push('| Category | Total | Passed | Failed | Skipped | Pass Rate |');
lines.push('|---|---:|---:|---:|---:|---:|');

for (const category of reportCategories) {
  const summary = aggregateCounts(byCategory.get(category) || []);
  lines.push(
    `| ${escapeMd(category)} | ${summary.total} | ${summary.passed} | ${summary.failed} | ${summary.skipped} | ${summary.passRate.toFixed(
      2
    )}% |`
  );
}

lines.push('');
lines.push('## Section 2: Detail by Category');
lines.push('');

for (const category of reportCategories) {
  const categoryRecords = byCategory.get(category) || [];
  const byFile = new Map();

  for (const record of categoryRecords) {
    if (!byFile.has(record.file)) byFile.set(record.file, []);
    byFile.get(record.file).push(record);
  }

  lines.push(`### ${category}`);
  lines.push('');
  lines.push('| File | Total | Passed | Failed | Skipped | Pass Rate |');
  lines.push('|---|---:|---:|---:|---:|---:|');

  const files = [...byFile.keys()].sort((a, b) => a.localeCompare(b));
  if (files.length === 0) {
    lines.push('| - | 0 | 0 | 0 | 0 | 0.00% |');
  } else {
    for (const file of files) {
      const fileSummary = aggregateCounts(byFile.get(file));
      lines.push(
        `| ${escapeMd(file)} | ${fileSummary.total} | ${fileSummary.passed} | ${fileSummary.failed} | ${fileSummary.skipped} | ${fileSummary.passRate.toFixed(
          2
        )}% |`
      );
    }
  }

  const failedRecords = categoryRecords.filter((record) => classifyStatus(record.status) === 'failed');
  if (failedRecords.length > 0) {
    lines.push('');
    lines.push('#### Failure Notes');
    lines.push('');
    lines.push('| File Name | Test Case Name | Root Cause / Error | Action / Ticket | Status |');
    lines.push('|---|---|---|---|---|');

    for (const failed of failedRecords) {
      // If a failed test exists in known-issues.json, show root cause/ticket from that source.
      // Otherwise, treat it as a new issue and show the real Playwright error message.
      const knownIssue = resolveKnownIssue(failed.testName, failed.fullTitle);
      const rootCauseOrError = knownIssue
        ? knownIssue.root_cause || 'Known issue (no root cause provided).'
        : failed.errorMessage || 'No error message from Playwright.';
      const actionTicket = knownIssue ? knownIssue.ticket || '-' : '-';
      const status = knownIssue ? knownIssue.status || 'Known Issue' : '\u{1F534} New Bug / Investigate';
      const displayName = `[${failed.projectName}] ${failed.testName}`;

      lines.push(
        `| ${escapeMd(failed.file)} | ${escapeMd(displayName)} | ${escapeMd(
          rootCauseOrError
        )} | ${escapeMd(actionTicket)} | ${escapeMd(status)} |`
      );
    }
  }

  lines.push('');
}

fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`[report] TEST_REPORT generated: ${outputPath}`);
