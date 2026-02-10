# Quick Guide (Runbook)

This page summarizes how to run tests and what they connect to.

## 1) Local testing (default)
Assumes your target web app is running locally (for example in `robot-store-sandbox`: `npm run dev`) and connects to **Neon test_db**.

```bash
npm run test
```

- Uses `.env` as the single source of truth
- `BASE_URL` defaults to `http://localhost:3000`
- **Reset/seed runs** (unless `SEED_DATA=false`)
- Seed data comes from `robot-store-sandbox/database/init.sql`

## 2) Production testing (safe only)
Runs against the real deployed URL and only safe tests.

```bash
npm run test:prod
```

- Overrides `BASE_URL` ? `https://robot-store-sandbox.onrender.com`
- Overrides `BASE_URL` -> `https://robot-store-sandbox.onrender.com`
- Only runs `@safe` or `@smoke` tests
- **Reset/seed is skipped** automatically

## 3) Run a single file
```bash
npx playwright test tests/e2e/catalog.e2e.spec.ts --project=chromium
```

## 4) Tag-based runs
```bash
npx playwright test --grep "@safe"
```

```bash
npx playwright test --grep "@smoke"
```

```bash
npx playwright test --grep "@regression"
```

## 5) Seed control (local only)
```bash
# Skip auto seed
SEED_DATA=false npx playwright test

# Override stock for all products
SEED_STOCK=200 npx playwright test
```

## 6) Seed source path override
If your web repo is not at the default path:
```bash
INIT_SQL_PATH=C:\path\to\robot-store-sandbox\database\init.sql npx playwright test
```

## 7) Key environment variables
- `BASE_URL`
- `DATABASE_URL`
- `TEST_API_KEY`
- `RESET_KEY`
- `SEED_DATA`
- `SEED_STOCK`
- `INIT_SQL_PATH`

> Tip: keep `.env` updated and consistent with the web app config.

## See also
- [Environments & .env](./environments.md)
- [Tagging Convention](./tagging-convention.md)
- [Test Taxonomy](./test-taxonomy.md)
- [CI Pipeline](./ci-pipeline.md)
- [A11y Guide](./a11y-guide.md)
- [Allure Guide](./allure-guide.md)
