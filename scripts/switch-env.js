const fs = require('fs');
const path = require('path');

const PROFILE_MAP = {
  local: '.env.local',
  prod: '.env.prod'
};

const parseSimpleEnv = (raw) => {
  const result = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed
      .slice(idx + 1)
      .trim()
      .replace(/^"(.*)"$/, '$1');
    result[key] = value;
  }
  return result;
};

const resolveSource = (profile) => {
  const main = PROFILE_MAP[profile];
  if (!main) return null;

  const mainPath = path.resolve(process.cwd(), main);
  if (fs.existsSync(mainPath)) return { path: mainPath, kind: 'profile' };

  const fallback = `${main}.example`;
  const fallbackPath = path.resolve(process.cwd(), fallback);
  if (fs.existsSync(fallbackPath)) return { path: fallbackPath, kind: 'example' };

  return null;
};

const profile = String(process.argv[2] || '')
  .trim()
  .toLowerCase();
if (!profile || !PROFILE_MAP[profile]) {
  console.error('Usage: node scripts/switch-env.js <local|prod>');
  process.exit(1);
}

const source = resolveSource(profile);
if (!source) {
  console.error(
    `[env] Missing profile file. Expected ${PROFILE_MAP[profile]} or ${PROFILE_MAP[profile]}.example`
  );
  process.exit(1);
}

const destinationPath = path.resolve(process.cwd(), '.env');
const content = fs.readFileSync(source.path, 'utf-8');
fs.writeFileSync(destinationPath, content);

const parsed = parseSimpleEnv(content);
console.log(`[env] Active profile: ${profile}`);
console.log(`[env] Source: ${path.basename(source.path)} (${source.kind})`);
console.log(`[env] BASE_URL=${parsed.BASE_URL || '(unset)'}`);
console.log(`[env] PERF_BASE_URL=${parsed.PERF_BASE_URL || '(unset)'}`);
console.log(`[env] SEED_DATA=${parsed.SEED_DATA || '(unset)'}`);
