# Robot Store Playwright Automation

Single-source documentation for this repository.
This project combines Playwright (functional) and k6 (performance) testing for the Robot Store sandbox app.

## 1. What This Repo Covers

- UI/API/Integration/Security/A11y tests with Playwright
- Performance/load tests with k6
- Safe production smoke checks (`@smoke`, `@safe`)
- Local deterministic test setup with reset/seed hooks

## 2. Tech Stack

- Node.js + TypeScript
- Playwright (`@playwright/test`)
- k6
- Allure (`allure-playwright`, `allure-commandline`)
- axe (`@axe-core/playwright`)
- ESLint + Prettier
- PostgreSQL client (`pg`)

## 3. Prerequisites

1. Install dependencies:

```bash
npm install
```

2. Prepare environment profiles:

- Copy `.env.local.example` -> `.env.local`
- Copy `.env.prod.example` -> `.env.prod`
- Activate one profile into `.env`:

```bash
npm run env:use:local
# or
npm run env:use:prod
```

3. If using local mode, run the companion app (`robot-store-sandbox`) at `http://localhost:3000`.

4. If using performance tests, install k6.

## 4. Environment Strategy

### Profiles

- `.env.local`
  - `BASE_URL=http://localhost:3000`
  - Recommended DB branch: Neon `test_db`
  - `SEED_DATA=true` for deterministic local runs
- `.env.prod`
  - `BASE_URL=https://robot-store-sandbox.onrender.com`
  - Intended for hosted safe checks
  - `SEED_DATA=false`

### URL Resolution

- Playwright target:
  1. `BASE_URL`
  2. fallback `http://localhost:3000`

- k6 target:
  1. `PERF_BASE_URL`
  2. `REAL_URL` (legacy)
  3. `BASE_URL`
  4. fallback `http://localhost:3000`

Inspect active targets:

```bash
npm run env:targets
```

### Safety Rules

- Destructive hooks (`/api/test/reset`, `/api/test/seed`) are allowed only for localhost by default.
- Override only when intentional:
  - `ALLOW_DESTRUCTIVE_TEST_HOOKS=true`

## 5. Run Modes

### Quick reviewer mode (hosted, no companion repo)

```bash
npm run env:use:prod
npm run env:targets
npm run test:smoke
```

### Local dev mode

In `robot-store-sandbox`:

```bash
npm install
npm run dev
```

In this repo:

```bash
npm run env:use:local
npm run env:targets
npm run ci:quick
npm run test
```

### Safe production check

```bash
npm run test:prod
```

`test:prod` runs only `@smoke|@safe` tests.

## 6. Test Architecture

### Layering

1. `tests/**`

- Own flow and assertions
- Keep specs readable and intent-focused

2. `src/pages/**`

- Page Objects hold selectors and UI interactions

3. `src/fixtures/**`

- Typed shared setup/context (API, auth, seed lifecycle)

4. `src/test-support/**`

- Cross-spec helpers

5. `src/api/**`

- Reusable API clients and request wrappers

6. `src/config/**`, `src/data/**`

- Env, routes, constants, test data

7. `performance/**`

- k6 shared libraries, scenarios, thresholds, scripts

### Repository structure

```text
src/
tests/
performance/
scripts/
.github/workflows/
```

## 7. Test Taxonomy and Tags

### Taxonomy

- Functional: `tests/api`, `tests/integration`, `tests/e2e`
- Non-functional: `tests/a11y`, `tests/security`
- Performance: `performance/scripts/*.k6.js`

### Core tags

- `@smoke`: fast checks
- `@regression`: broader coverage
- `@api`, `@a11y`, `@security`

### Safety tags

- `@safe`: non-destructive
- `@destructive`: data-mutating

Guideline:

- Use `@safe` for read-only tests.
- Use `@destructive` when changing data (seed/reset/checkout/admin writes).

## 8. Command Reference

### Playwright

- `npm run test`
- `npm run test:smoke`
- `npm run test:regression`
- `npm run test:api`
- `npm run test:a11y`
- `npm run test:quick-regression`
- `npm run test:quick-regression:stable`
- `npm run test:prod`

Run single file:

```bash
npx playwright test tests/e2e/catalog.e2e.spec.ts --project=chromium
```

Run by tag:

```bash
npx playwright test --grep "@smoke"
```

### Quality gates

- `npm run format`
- `npm run format:check`
- `npm run typecheck`
- `npm run lint`
- `npm run lint:fix`
- `npm run ci:quality`
- `npm run ci:quick`

### Reporting

- `npm run allure:clean`
- `npm run report:allure`
- `npm run report:open`

### Environment and stock utilities

- `npm run env:use:local`
- `npm run env:use:prod`
- `npm run env:targets`
- `npm run stock:reset`
- `npm run stock:reset:local`
- `npm run stock:reset:prod`

### k6

- `npm run test:perf:smoke`
- `npm run test:perf:auth`
- `npm run test:perf:browse`
- `npm run test:perf:cart`
- `npm run test:perf:checkout`
- `npm run test:perf:checkout-acceptance`
- `npm run test:perf:race`
- `npm run test:perf:load`
- `npm run test:perf:load-acceptance`
- `npm run test:perf:stress`
- `npm run test:perf:soak`
- `npm run test:perf:breakpoint`
- `npm run test:perf:suite`
- `npm run test:perf:suite:gate`

### Docker

- `docker compose run --rm qa-playwright`
- `docker compose run --rm qa-k6`

For container -> local app testing:

- `BASE_URL=http://host.docker.internal:3000`

## 9. Accessibility and Allure

### Accessibility (axe)

```bash
npm run test:a11y
# or
npx playwright test tests/a11y --grep "@a11y"
```

A11y helper behavior is centralized in `src/utils/a11y.ts`.

### Allure

```bash
npm run report:allure
npm run report:open
```

Allure artifacts are generated from `allure-results`.

## 10. CI/CD Coverage in This Repo

### Active CI workflows

- `.github/workflows/quick-regression.yml`
- `.github/workflows/ui-smoke.yml`
- `.github/workflows/api.yml`
- `.github/workflows/a11y.yml`
- `.github/workflows/regression-nightly.yml`
- `.github/workflows/k6-nightly.yml`

### CI behavior summary

- `quick-regression`: `ci:quality` + quick smoke/regression subset
- `ui-smoke`: safe UI/security/a11y slice
- `api`: API smoke/security slice
- `a11y`: accessibility smoke slice
- `regression-nightly`: wider regression subset
- `k6-nightly`: performance gate suite

Common CI defaults:

- `@chat`/`@ai` excluded in routine runs
- destructive tests are excluded from PR-safe paths
- artifacts are uploaded (`playwright-report`, `test-results`, `allure-*`, `performance/results/*`)

## 11. Performance Evidence Snapshot

Latest committed evidence references:

- Portfolio manifest: `performance/results/20260209-121019-portfolio/manifest.md`
- Gate manifest: `performance/results/20260209-122753-gate/manifest.md`
- Latest pointer: `performance/results/latest.txt`

Observed bottlenecks from latest gate/portfolio artifacts:

- `checkout-strict`: unexpected outcomes and elevated checkout latency under spike
- `stress-quick`: p95 response time above threshold
- `soak-quick`: p95 response time above threshold

Backlog ticket drafts were previously tracked in this repo and are now summarized here as work items:

1. Stabilize checkout under concurrency (`checkout-strict` gate failures).
2. Reduce stress p95 latency to threshold target.
3. Improve soak p95 stability over sustained duration.

## 12. Known Limitations / Trade-offs

- `@chat`/`@ai` tests are excluded from routine CI due to external dependency/cost variance.
- k6 thresholds can fail in shared hosted environments because runtime/network conditions vary.
- Destructive test paths are intentionally constrained for safety.

## 13. Troubleshooting

### Tests fail with 403 on `/api/test/reset`

Likely causes:

- target is hosted environment where destructive hooks are disabled
- incorrect `TEST_API_KEY`/`RESET_KEY`
- backend test hooks not enabled for that environment

### Checkout/perf failures with low stock

Reset stock before stock-sensitive runs:

```bash
npm run stock:reset:local
# or
npm run stock:reset:prod
```

### Allure generation seems slow/stuck

Clean old artifacts first:

```bash
npm run allure:clean
npm run test:smoke
npm run report:allure
```

## 14. Portfolio Reviewer Path (Suggested)

For the fastest reproducible review:

1. `npm install`
2. `npm run env:use:prod`
3. `npm run ci:quality`
4. `npm run test:smoke`
5. `npm run report:allure`

This sequence verifies code quality, smoke stability, and report generation with minimal setup.
