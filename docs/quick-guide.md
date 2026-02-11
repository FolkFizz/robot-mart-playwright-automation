# Quick Guide (Runbook)

This page summarizes how to run tests and what they connect to.

## 1) Quick review mode (no companion repo required)

Use hosted sandbox URL so reviewers can run immediately.

```bash
npm run env:targets
npm run test:smoke
```

Recommended profile:

```bash
npm run env:use:prod
```

## 2) Local dev mode (with companion app repo)

Use this when developing/debugging tests.

In `robot-store-sandbox`:

```bash
npm install
npm run dev
```

In this test repo:

```bash
npm run env:use:local
npm run env:targets
npm run ci:quick
npm run test
```

- Uses profile templates (`.env.local` / `.env.prod`) and copies active profile to `.env`
- **Reset/seed runs** (unless `SEED_DATA=false`)
- Seed path strategy: API test hooks first, SQL fallback from `database/init.sql`

## 3) Production testing (safe only)

Runs against the real deployed URL and only safe tests.

```bash
npm run test:prod
```

- Overrides `BASE_URL` to `https://robot-store-sandbox.onrender.com`
- Only runs `@safe` or `@smoke` tests
- **Reset/seed is skipped** automatically

## 4) Run a single file

```bash
npx playwright test tests/e2e/catalog.e2e.spec.ts --project=chromium
```

## 5) Tag-based runs

```bash
npx playwright test --grep "@safe"
```

```bash
npx playwright test --grep "@smoke"
```

```bash
npx playwright test --grep "@regression"
```

## 6) Seed control (local only)

```bash
# Skip auto seed
SEED_DATA=false npx playwright test

# Override stock for all products
SEED_STOCK=200 npx playwright test
```

## 7) Seed source path override

If your web repo is not at the default path:

```bash
INIT_SQL_PATH=C:\path\to\robot-store-playwright-automation\database\init.sql npx playwright test
```

## 8) Key environment variables

- `BASE_URL`
- `PERF_BASE_URL` (optional k6 override)
- `REAL_URL` (legacy k6 override)
- `DATABASE_URL`
- `TEST_API_KEY`
- `RESET_KEY`
- `SEED_DATA`
- `SEED_STOCK`
- `ALLOW_DESTRUCTIVE_TEST_HOOKS`
- `INIT_SQL_PATH`

> Tip: keep `.env` updated and consistent with the web app config.
> Tip: run `npm run env:targets` before starting a new test session.

## 9) Docker quick note

- `docker compose run --rm qa-playwright` uses hosted sandbox by default.
- If container should hit your local app, set:
  - `BASE_URL=http://host.docker.internal:3000`

## See also

- [Environments & .env](./environments.md)
- [Test Architecture](./test-architecture.md)
- [Tagging Convention](./tagging-convention.md)
- [Test Taxonomy](./test-taxonomy.md)
- [CI Pipeline](./ci-pipeline.md)
- [A11y Guide](./a11y-guide.md)
- [Allure Guide](./allure-guide.md)

