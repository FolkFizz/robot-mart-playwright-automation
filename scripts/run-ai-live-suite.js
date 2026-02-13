const { spawnSync } = require('child_process');

const run = (command, args, env = process.env) => {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    env
  });
};

const check = run('node', ['scripts/ai-budget-gate.js', 'check']);
if (check.status !== 0) {
  process.exit(check.status || 1);
}

const liveEnv = {
  ...process.env,
  RUN_AI_LIVE: 'true'
};

const extraArgs = process.argv.slice(2);
const testArgs = [
  'playwright',
  'test',
  'tests/api/chat.ai-live.spec.ts',
  '--project=chromium',
  '--grep',
  '@ai-live',
  '--workers=1',
  ...extraArgs
];

const testRun = run('npx', testArgs, liveEnv);

const consume = run('node', ['scripts/ai-budget-gate.js', 'consume']);
if (consume.status !== 0) {
  process.exit(consume.status || 1);
}

process.exit(testRun.status || 0);
