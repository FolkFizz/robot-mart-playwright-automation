const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const parsePositiveInt = (raw, fallback) => {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveTargetBaseUrl = () => {
  const explicit = process.env.STOCK_RESET_BASE_URL?.trim();
  if (explicit) return explicit;

  const base = process.env.BASE_URL?.trim();
  if (base) return base;

  const perfBase = process.env.PERF_BASE_URL?.trim();
  if (perfBase) return perfBase;

  return 'http://localhost:3000';
};

const main = async () => {
  const baseUrl = resolveTargetBaseUrl().replace(/\/+$/, '');
  const endpoint = `${baseUrl}/api/products/reset-stock`;
  const resetKey = process.env.RESET_KEY?.trim() || process.env.PERF_RESET_KEY?.trim();
  const stockAll = parsePositiveInt(process.env.PERF_STOCK_ALL, 300);

  if (!resetKey) {
    console.error('[stock:reset] Missing RESET_KEY (or PERF_RESET_KEY) in active .env profile.');
    process.exit(1);
  }

  console.log(`[stock:reset] target=${endpoint}`);
  console.log(`[stock:reset] stockAll=${stockAll}`);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-reset-key': resetKey
    },
    body: JSON.stringify({ stockAll })
  });

  const body = await res.text().catch(() => '');
  const preview = body.slice(0, 500);

  if (!res.ok) {
    console.error(`[stock:reset] failed status=${res.status}`);
    console.error(`[stock:reset] response=${preview}`);
    process.exit(1);
  }

  console.log(`[stock:reset] success status=${res.status}`);
  console.log(`[stock:reset] response=${preview}`);
};

main().catch((error) => {
  console.error(`[stock:reset] error=${error.message}`);
  process.exit(1);
});
