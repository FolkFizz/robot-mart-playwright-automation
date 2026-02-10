# Robot Store Playwright Automation

Automation test workspace for the Robot Store sandbox application.
This repository combines Playwright functional testing and k6 performance testing
in one place, with reproducible evidence artifacts for portfolio and QA reporting.

## Project Scope

- UI/API/Integration/Security/A11y coverage with Playwright
- Load and performance coverage with k6
- Safe production smoke checks (`@smoke` + `@safe`)
- Local deterministic reset/seed support for stable test runs

## Current Snapshot

Verification status: run `npm run ci:quality` and `npm run ci:quick` on the current commit.

- Playwright specs: `27`
  - `tests/e2e`: 10
  - `tests/api`: 5
  - `tests/integration`: 5
  - `tests/security`: 4
  - `tests/a11y`: 3
- k6 scripts: `10` in `performance/scripts/`
- Latest performance evidence:
  - Portfolio: `performance/results/20260209-121019-portfolio/manifest.md`
  - Gate: `performance/results/20260209-122753-gate/manifest.md`
- CI status:
  - Active workflows under `.github/workflows/`:
    - `quick-regression.yml`
    - `ui-smoke.yml`
    - `api.yml`
    - `a11y.yml`
    - `regression-nightly.yml`
    - `k6-nightly.yml`
  - Automatic CI excludes `@chat/@ai` by default to avoid external LLM dependency/cost in routine runs

## Tech Stack

- Node.js + TypeScript
- Playwright (`@playwright/test`)
- k6 (performance tests)
- Allure reporter (`allure-playwright`)
- axe-core integration for accessibility
- ESLint + Prettier (quality gates)
- PostgreSQL client (`pg`) for reset/seed hooks
- Docker / Docker Compose (portable local execution)

## Prerequisites

1. Install dependencies

```bash
npm install
```

2. Configure `.env` (single source of truth)
3. Ensure target application is reachable
   - Local mode: run companion app repo `robot-store-sandbox` with `npm run dev`
   - Hosted mode: point to deployed URL
4. Optional for performance testing:
   - Install k6
   - Provide `RESET_KEY` for stock reset endpoint
5. Optional for containerized execution:
   - Docker Desktop (or Docker Engine + Compose v2)

## Required Environment Variables

- `BASE_URL` (defaults to `http://localhost:3000` if not set in Playwright)
- `DATABASE_URL`
- `TEST_API_KEY`
- `RESET_KEY`
- `USER_USERNAME`
- `USER_PASSWORD`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

## URL Strategy (Important)

- Playwright target:
  - Uses `BASE_URL` only
  - Fallback: `http://localhost:3000`
- k6 target (priority order):
  1. `PERF_BASE_URL` (recommended)
  2. `REAL_URL` (legacy alias)
  3. `BASE_URL`
  4. `http://localhost:3000`

Quick check:

```bash
npm run env:targets
```

## Run Modes (Recommended)

1. Quick Review Mode (no companion repo required)
   - Use hosted target
   - Example `.env`:
     - `BASE_URL="https://robot-store-sandbox.onrender.com"`
     - `PERF_BASE_URL="https://robot-store-sandbox.onrender.com"`
   - Best for portfolio reviewers who want fast validation

2. Local Dev Mode (with companion app repo)
   - In `robot-store-sandbox` repo:
     - `npm install`
     - `npm run dev`
   - In this repo `.env`:
     - `BASE_URL="http://localhost:3000"`
     - `PERF_BASE_URL` optional (set only if k6 should hit a different target)
   - Best for debugging and development feedback loop

Optional:

- `SEED_DATA` (`false` to skip auto seed/reset)
- `SEED_STOCK` (override stock value after seed)
- `INIT_SQL_PATH` (custom path to fallback SQL file, e.g. `database/init.sql`)
- `PERF_BASE_URL` (optional k6-only override target)
- `REAL_URL` (legacy k6 override, keep empty in new setups)

## Quick Start

1. Verify target URL resolution (recommended before running)

```bash
npm run env:targets
```

2. Run smoke tests

```bash
npm run test:smoke
```

3. Run quality gates

```bash
npm run ci:quality
```

4. Run full Playwright suite

```bash
npm run test
```

5. Run production-safe suite

```bash
npm run test:prod
```

## Command Reference

Playwright:

- `npm run test`
- `npm run test:smoke`
- `npm run test:regression`
- `npm run test:api`
- `npm run test:a11y`
- `npm run test:prod`
- `npm run test:quick-regression`

Quality:

- `npm run format`
- `npm run format:check`
- `npm run typecheck`
- `npm run lint`
- `npm run lint:fix`
- `npm run ci:quality`
- `npm run ci:quick`

Reporting:

- `npm run report:allure`
- `npm run report:open`

Utilities:

- `npm run env:targets`

k6 performance:

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

Docker:

- `docker compose run --rm qa-playwright` (safe smoke via container)
- `docker compose run --rm qa-k6` (k6 smoke via container)
- For local app target from container, set `BASE_URL=http://host.docker.internal:3000`

## Project Structure

```text
src/                    # fixtures, page objects, api clients, utilities
tests/                  # Playwright specs (a11y/api/e2e/integration/security)
performance/            # k6 scripts, data, thresholds, results, perf docs
docs/                   # focused runbooks and conventions
scripts/                # helper runners (run-k6, run-perf-suite)
.github/workflows/      # active GitHub Actions workflows (PR checks + weekly schedules)
```

## Documentation Index

General docs:

- `docs/quick-guide.md`
- `docs/environments.md`
- `docs/test-architecture.md`
- `docs/tagging-convention.md`
- `docs/test-taxonomy.md`
- `docs/a11y-guide.md`
- `docs/allure-guide.md`
- `docs/ci-pipeline.md`

Performance docs:

- `performance/README.md`
- `performance/final-report.md`
- `performance/issues/performance-backlog-2026-02-09.md`

## Documentation Consolidation Decision

- Kept all `docs/*.md` files because each has a focused purpose (runbook, env, tags, taxonomy, reporting)
- Updated root `README.md` as the single onboarding entry point
- Kept one canonical performance summary at `performance/final-report.md`
- Removed duplicate summary copy in `performance/results/` to avoid drift

## Notes

- Production protection is built into reset/seed hooks: destructive resets are skipped when `BASE_URL` points to `robot-store-sandbox.onrender.com`
- Performance suites can fail by design when thresholds expose real bottlenecks; this is treated as evidence, not script failure

## Known Limitations

- `@chat/@ai` tests are excluded from routine CI by default because they can depend on external LLM availability/cost.
- Some destructive tests (`@destructive`) are intentionally excluded from PR-safe smoke workflows.
- k6 thresholds can fail on shared environments due to live network variance; this is expected signal, not framework instability.
