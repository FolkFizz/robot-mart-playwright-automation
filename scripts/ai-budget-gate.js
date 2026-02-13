#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const mode = String(process.argv[2] || 'check').toLowerCase();
const supportedModes = new Set(['check', 'consume', 'report']);

if (!supportedModes.has(mode)) {
  console.error('Usage: node scripts/ai-budget-gate.js <check|consume|report>');
  process.exit(1);
}

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'y', 'on'].includes(String(value).toLowerCase());
};

if (toBool(process.env.AI_BUDGET_DISABLE, false)) {
  console.log('[ai-budget] Disabled by AI_BUDGET_DISABLE=true.');
  process.exit(0);
}

const rpdLimit = toPositiveInt(process.env.AI_RPD_LIMIT, 20);
const reserve = toPositiveInt(process.env.AI_RPD_RESERVE, 12);
const defaultAutomationBudget = Math.max(1, rpdLimit - reserve);
const automationBudget = toPositiveInt(process.env.AI_AUTOMATION_DAILY_BUDGET, defaultAutomationBudget);
const requestsPerCase = toPositiveInt(process.env.AI_LIVE_REQUESTS_PER_CASE, 1);
const plannedOverride = Number.parseInt(String(process.env.AI_LIVE_PLANNED_REQUESTS ?? ''), 10);
const statePath = path.resolve(
  process.cwd(),
  process.env.AI_BUDGET_STATE_FILE || 'test-results/.ai-live-budget.json'
);
const todayUtc = new Date().toISOString().slice(0, 10);

const readState = () => {
  try {
    const raw = fs.readFileSync(statePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { date: todayUtc, used: 0 };
    const used = Number.parseInt(String(parsed.used ?? '0'), 10);
    return {
      date: String(parsed.date || todayUtc),
      used: Number.isFinite(used) && used >= 0 ? used : 0
    };
  } catch (_err) {
    return { date: todayUtc, used: 0 };
  }
};

const writeState = (state) => {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
};

const listFiles = (dir) => {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results.push(...listFiles(fullPath));
      continue;
    }
    if (item.isFile() && fullPath.endsWith('.spec.ts')) {
      results.push(fullPath);
    }
  }
  return results;
};

const countAiLiveCases = () => {
  const root = path.resolve(process.cwd(), 'tests');
  if (!fs.existsSync(root)) return 0;

  const files = listFiles(root);
  const testWithAiLiveRegex =
    /test(?:\.(?:only|skip|fixme))?\s*\(\s*(['"`])[\s\S]*?@ai-live[\s\S]*?\1/g;

  let total = 0;
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const matches = content.match(testWithAiLiveRegex);
    if (matches) total += matches.length;
  }
  return total;
};

const aiLiveCases = countAiLiveCases();
const plannedRequests =
  Number.isFinite(plannedOverride) && plannedOverride > 0
    ? plannedOverride
    : aiLiveCases * requestsPerCase;

let state = readState();
if (state.date !== todayUtc) {
  state = { date: todayUtc, used: 0 };
}

const nextUsed = state.used + plannedRequests;
const remainingBefore = Math.max(0, automationBudget - state.used);
const remainingAfter = Math.max(0, automationBudget - nextUsed);

console.log(`[ai-budget] mode=${mode}`);
console.log(`[ai-budget] date_utc=${todayUtc}`);
console.log(`[ai-budget] live_cases=${aiLiveCases}`);
console.log(`[ai-budget] planned_requests=${plannedRequests}`);
console.log(`[ai-budget] used_today=${state.used}`);
console.log(`[ai-budget] automation_budget=${automationBudget} (rpd_limit=${rpdLimit}, reserve=${reserve})`);

if (mode === 'report') {
  console.log(`[ai-budget] remaining_today=${remainingBefore}`);
  process.exit(0);
}

if (plannedRequests <= 0) {
  console.log('[ai-budget] No @ai-live test cases found. Nothing to gate.');
  process.exit(0);
}

if (mode === 'check') {
  if (nextUsed > automationBudget) {
    console.error(
      `[ai-budget] Blocked: planned ${plannedRequests} would exceed budget (${state.used}/${automationBudget} used).`
    );
    process.exit(1);
  }
  console.log(`[ai-budget] OK: remaining_after_run=${remainingAfter}`);
  process.exit(0);
}

if (mode === 'consume') {
  if (nextUsed > automationBudget) {
    console.error(
      `[ai-budget] Consume blocked: planned ${plannedRequests} exceeds budget (${state.used}/${automationBudget} used).`
    );
    process.exit(1);
  }
  const updated = { date: todayUtc, used: nextUsed };
  writeState(updated);
  console.log(`[ai-budget] Consumed ${plannedRequests}. remaining_today=${remainingAfter}`);
  process.exit(0);
}
