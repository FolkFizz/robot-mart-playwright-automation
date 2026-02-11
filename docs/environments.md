# Environments and DB Branch Strategy

This project uses profile-based env files to prevent accidental cross-environment data changes.

## Profiles

- `.env.local`:
  - `BASE_URL=http://localhost:3000`
  - Recommended DB: Neon `test_db` branch
  - `SEED_DATA=true` for deterministic local runs
- `.env.prod-safe`:
  - `BASE_URL=https://robot-store-sandbox.onrender.com`
  - Hosted read-safe checks
  - `SEED_DATA=false`

Templates:

- `.env.local.example`
- `.env.prod-safe.example`

## Profile switch commands

```bash
npm run env:use:local
npm run env:use:prod-safe
npm run env:targets
```

`env:targets` prints active URL targets and seed safety flags.

## URL behavior

- Playwright target:
  - Uses `BASE_URL`
  - Default fallback: `http://localhost:3000`
- k6 target priority:
  1. `PERF_BASE_URL`
  2. `REAL_URL` (legacy)
  3. `BASE_URL`
  4. `http://localhost:3000`

## Destructive hook safety

- Destructive hooks (`/api/test/reset`, `/api/test/seed`) are allowed only when target URL is localhost.
- For non-localhost targets, hooks are skipped by default.
- Override only intentionally with:
  - `ALLOW_DESTRUCTIVE_TEST_HOOKS=true`

## Required variables

- `DATABASE_URL`
- `TEST_API_KEY`
- `RESET_KEY`
- `USER_USERNAME`, `USER_PASSWORD`
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`

## Optional variables

- `SEED_DATA` (`false` to skip auto seed/reset)
- `SEED_STOCK` (stock baseline for seeded data)
- `ALLOW_DESTRUCTIVE_TEST_HOOKS` (default `false`)
- `PERF_BASE_URL`
- `PERF_STOCK_ALL` (k6 stock baseline used by reset-stock flow, default `300`)
- `REAL_URL` (legacy)
- `CHAOS_ENABLED`
- `PAYMENT_MOCK`

## Recommended DB branch mapping

- Hosted Render app: Neon `production` branch
- Local automation + local app: Neon `test_db` branch

This keeps portfolio demo data stable while local runs can reset freely.
