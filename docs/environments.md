# Environments & .env (Single Source of Truth)

This project uses a single `.env` file for both **local app** and **test** runs.
There is no `.env.test`. Keep everything in `.env`.

## URL behavior

- Playwright target:
  - Uses `BASE_URL`
  - Default: `http://localhost:3000`
- k6 target (priority order):
  1. `PERF_BASE_URL` (recommended override)
  2. `REAL_URL` (legacy alias)
  3. `BASE_URL`
  4. `http://localhost:3000`
- Prod-safe Playwright run: `npm run test:prod` (overrides `BASE_URL` to Render)
- Quick resolution check: `npm run env:targets`

## Practical setup patterns

- Quick review (no companion repo): set both `BASE_URL` and `PERF_BASE_URL` to deployed URL
- Local development: run `robot-store-sandbox` with `npm run dev`, then set `BASE_URL=http://localhost:3000`

## Required variables

These are expected by the test project:

- `BASE_URL` (optional; defaults to `http://localhost:3000`)
- `DATABASE_URL` (single source of truth for DB)
- `TEST_API_KEY` (for `/api/test/seed` and `/api/test/reset`)
- `RESET_KEY` (for reset-stock endpoint)
- `USER_USERNAME`, `USER_PASSWORD`
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`

## Optional variables

- `CHAOS_ENABLED` (true/false)
- `PAYMENT_MOCK` (e.g. `mock` or `stripe` if UI supports)
- `SEED_DATA` (`false` to skip auto seed/reset)
- `SEED_STOCK` (number to override stock after seed)
- `INIT_SQL_PATH` (absolute path to `init.sql` if the web repo is not at the default location)
- `PERF_BASE_URL` (k6-only explicit override target)
- `REAL_URL` (legacy k6 alias; keep empty for new setups)

## Seed source (important)

- Local reset/seed uses the SQL script from the **web repo**: `robot-store-sandbox/database/init.sql`.
- Default location: `../robot-store-sandbox/database/init.sql`
- Override with `INIT_SQL_PATH` if your web repo lives elsewhere.

## Example .env

```env
BASE_URL=http://localhost:3000
PERF_BASE_URL=
REAL_URL=
DATABASE_URL=postgres://...
TEST_API_KEY=mytestkey
RESET_KEY=resetkey
USER_USERNAME=user
USER_PASSWORD=user123
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
CHAOS_ENABLED=false
PAYMENT_MOCK=mock
SEED_DATA=true
SEED_STOCK=100
INIT_SQL_PATH=C:\QA-SANDBOX\robot-store-sandbox\database\init.sql
```

## Safety notes

- When `BASE_URL` points to production (`robot-store-sandbox.onrender.com`),
  the reset/seed logic is automatically **skipped** to avoid destructive actions.
- For local runs, reset/seed will run (unless `SEED_DATA=false`).

## See also

- [Quick Guide](./quick-guide.md)
- [Tagging Convention](./tagging-convention.md)
