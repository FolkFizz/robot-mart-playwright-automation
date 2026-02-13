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
- Prometheus + Grafana (optional k6 live monitoring stack)
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

5. Optional (for live k6 monitoring dashboard): Docker Desktop / Docker Engine.

## 4. Environment Strategy

### Profiles

- `.env.local`
  - `APP_BASE_URL=http://localhost:3000`
  - Optional k6-only override: `K6_BASE_URL=...` (usually leave empty to reuse `APP_BASE_URL`)
  - `DATABASE_URL` is still required for direct-DB integration checks/fallback seeding.
  - Recommended local setup: Docker Postgres URL (`postgresql://postgres:password_local_docker@localhost:5433/robot_store_sandbox`)
  - `SEED_DATA=true` for deterministic local runs
- `.env.prod`
  - `APP_BASE_URL=https://robot-store-sandbox.onrender.com`
  - Optional k6-only override: `K6_BASE_URL=...` (set only when perf target differs from Playwright target)
  - `DATABASE_URL` should point to Neon/production branch
  - Intended for hosted safe checks
  - `SEED_DATA=false`

### URL Resolution

- Playwright target:
  1. `APP_BASE_URL`
  2. fallback `http://localhost:3000`

- k6 target:
  1. `K6_BASE_URL`
  2. `APP_BASE_URL`
  3. fallback `http://localhost:3000`

Legacy target vars from older versions (`BASE_URL`, `PERF_BASE_URL`, `REAL_URL`) are still read as fallback so old scripts do not break. For new setup, use only:

- `APP_BASE_URL` (main shared target)
- `K6_BASE_URL` (optional k6-only override)

Inspect active targets:

```bash
npm run env:targets
```

### Safety Rules

- Destructive hooks (`/api/test/reset`, `/api/test/seed`) are allowed only for localhost by default.
- Privileged stock-mutation tests are skipped on hosted targets by default.
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
docker compose up -d
```

Use this single command as the default local startup (app + db + mailpit).

To stop local stack:

```bash
docker compose down
```

To reset local DB volume:

```bash
docker compose down -v
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

### Local vs Production Test Matrix

Playwright:

| Scope                              | Recommended target                                       | Commands                                                                                                                                                    |
| ---------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full/active development coverage   | Local (`APP_BASE_URL=http://localhost:3000`)             | `npm run test`, `npm run test:regression`, `npm run test:api`, `npm run test:a11y`, `npm run test:quick-regression`, `npm run test:quick-regression:stable` |
| Lightweight hosted sanity check    | Production (`APP_BASE_URL=https://...onrender.com`)      | `npm run test:prod`, `npm run test:smoke`                                                                                                                   |
| Stock-mutation / privileged checks | Local by default (hosted run requires explicit override) | `tests/api/admin.api.spec.ts`, `tests/integration/product-cart.int.spec.ts`                                                                                 |

k6:

| Scope                            | Recommended target                                            | Commands                                                                                                                                                                                                                                                                                                  |
| -------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Low-risk hosted perf smoke       | Production (`K6_BASE_URL` empty so it follows `APP_BASE_URL`) | `npm run test:perf:smoke`, `npm run test:perf:auth`, `npm run test:perf:browse`, `npm run test:perf:breakpoint`, `npm run test:perf:suite:lite`                                                                                                                                                           |
| Write-heavy / capacity profiling | Local                                                         | `npm run test:perf:cart`, `npm run test:perf:checkout`, `npm run test:perf:checkout-acceptance`, `npm run test:perf:race`, `npm run test:perf:load`, `npm run test:perf:load-acceptance`, `npm run test:perf:stress`, `npm run test:perf:soak`, `npm run test:perf:suite`, `npm run test:perf:suite:gate` |

Notes:

- `K6_BASE_URL` is optional. Leave it empty to reuse `APP_BASE_URL`.
- A few Playwright integration flows read `DATABASE_URL` directly. Keep `DATABASE_URL` aligned with the target environment (`local Docker DB` for local runs, `Neon prod` for hosted checks).

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
- `@ai-mock`: deterministic chatbot checks (no external LLM quota usage)
- `@ai-live`: low-volume live canary checks (quota-budgeted)

### Safety tags

- `@safe`: non-destructive
- `@destructive`: data-mutating

Guideline:

- Use `@safe` for read-only tests.
- Use `@destructive` when changing data (seed/reset/checkout/admin writes).

### AI Test Lanes

- `@ai-mock` lane:
  - default lane for chatbot suites
  - expects deterministic backend responses (price/stock/safety) without consuming Gemini live quota
- `@ai-live` lane:
  - small canary-only live suite
  - gated by daily budget script before execution
  - runs with `--workers=1` to avoid burst requests

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
- `npm run test:ai:mock`
- `npm run test:ai:live`
- `npm run ai:budget:report`
- `npm run ai:budget:check`
- `npm run ai:budget:consume`

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
- `npm run report:snapshots`

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
- `npm run test:perf:suite:lite`
- `npm run test:perf:suite:gate`
- `npm run test:perf:smoke:monitor`
- `npm run test:perf:suite:monitor`
- `npm run test:perf:suite:gate:monitor`
- `npm run monitor:up`
- `npm run monitor:status`
- `npm run monitor:logs`
- `npm run monitor:down`
- `npm run monitor:down:volumes`

### Docker

- `docker compose run --rm qa-playwright`
- `docker compose run --rm qa-k6`
- `docker compose -f docker-compose.monitor.yml up -d`

For container -> local app testing:

- `APP_BASE_URL=http://host.docker.internal:3000`

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

## 10. Performance Monitoring (Prometheus + Grafana)

This repository now includes a ready-to-run local monitoring stack for k6:

- Prometheus receives k6 metrics via remote write
- Grafana auto-provisions datasource + dashboard on startup
- Dashboard file is versioned at `monitoring/grafana/dashboards/k6-overview.json`

Start stack:

```bash
npm run monitor:up
npm run monitor:status
```

Run k6 with remote-write output:

```bash
npm run test:perf:smoke:monitor
# or
npm run test:perf:suite:monitor
```

Open UIs:

- Grafana: `http://localhost:3001` (default login `admin` / `admin`)
- Prometheus: `http://localhost:9090`

Stop stack:

```bash
npm run monitor:down
```

Notes:

- Grafana is on port `3001` to avoid conflict with local app (`localhost:3000`).
- This does not replace Allure.
- Allure = Playwright functional test report, Prometheus/Grafana = k6 runtime metrics.

### README Visual Gallery (Allure + Grafana + Prometheus)

These images are designed for portfolio/reviewer-friendly README previews.

![Allure Report Overview](assets/readme/allure-overview.png)
![Grafana k6 Overview](assets/readme/grafana-k6-overview.png)
![Prometheus k6 Query Overview](assets/readme/prometheus-overview.png)

Refresh snapshots:

```bash
npm run report:allure
npm run monitor:up
npm run test:perf:smoke:monitor
npm run report:snapshots
```

Notes:

- Snapshot outputs are saved to `assets/readme/`.
- If a service is unavailable, snapshot script writes a clean placeholder image so README does not break.
- Optional env overrides:
  - `GRAFANA_URL`, `GRAFANA_DASHBOARD_URL`, `GRAFANA_USER`, `GRAFANA_PASSWORD`
  - `PROMETHEUS_URL`, `PROMETHEUS_GRAPH_URL`

## 11. CI/CD Coverage in This Repo

### Active CI workflows

- `.github/workflows/quick-regression.yml`
- `.github/workflows/ui-smoke.yml`
- `.github/workflows/api.yml`
- `.github/workflows/a11y.yml`
- `.github/workflows/ai-live-manual.yml`
- `.github/workflows/regression-nightly.yml`
- `.github/workflows/k6-nightly.yml`

### CI behavior summary

- `quick-regression`: `ci:quality` + quick smoke/regression subset
- `ui-smoke`: safe UI/security/a11y slice
- `api`: API smoke/security slice
- `a11y`: accessibility smoke slice
- `ai-live-manual`: manual low-volume live AI canary suite (`@ai-live`) with budget gate (state cached per UTC day)
- `regression-nightly`: wider regression subset
- `k6-nightly`: performance gate suite

Common CI defaults:

- `@chat`/`@ai` excluded in routine runs
- `@ai-live` is intended for manual/controlled runs with budget gate (`npm run test:ai:live`)
- destructive tests are excluded from PR-safe paths
- artifacts are uploaded (`playwright-report`, `test-results`, `allure-*`, `performance/results/*`)
- nightly schedules run only when repo variable `ENABLE_NIGHTLY=true`
- `k6-nightly` defaults to `lite` profile to reduce hosted DB load (manual dispatch can run `gate`/`portfolio`)

## 12. Performance Evidence Snapshot

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

## 13. Known Limitations / Trade-offs

- `@chat`/`@ai` tests are excluded from routine CI due to external dependency/cost variance.
- k6 thresholds can fail in shared hosted environments because runtime/network conditions vary.
- Destructive test paths are intentionally constrained for safety.

## 14. Troubleshooting

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

## 15. Portfolio Reviewer Path (Suggested)

For the fastest reproducible review:

1. `npm install`
2. `npm run env:use:prod`
3. `npm run ci:quality`
4. `npm run test:smoke`
5. `npm run report:allure`

This sequence verifies code quality, smoke stability, and report generation with minimal setup.

## 16. Final QA Checklist (Project Close-Out)

Use this checklist before declaring the project complete:

- [ ] Select target profile and verify:
  - `npm run env:use:local` or `npm run env:use:prod`
  - `npm run env:targets`
- [ ] Local stack health (when testing local):
  - in `robot-store-sandbox`: `docker compose up -d`
  - confirm app opens at `http://localhost:3000`
- [ ] Quality gates pass:
  - `npm run ci:quality`
- [ ] Core regression pass (Chromium, safe slice):
  - `npm run ci:quick`
- [ ] Hosted safe check pass:
  - `npm run test:prod`
- [ ] Functional report generated:
  - `npm run report:allure`
- [ ] Performance suite pass (local preferred for heavy profiles):
  - `npm run test:perf:suite:lite`
  - `npm run test:perf:suite:gate` (optional for capacity evidence)
- [ ] Monitoring evidence captured (k6 + Grafana):
  - run stack: `npm run monitor:up`
  - `npm run report:snapshots`
  - keep dashboard/result artifacts in `performance/results/*`
- [ ] CI workflows show at least one green run:
  - `quick-regression`, `ui-smoke`, `api`, `a11y`, `regression-nightly`, `k6-nightly`
- [ ] Cleanup temporary files before commit:
  - e.g. unneeded local-only result files under `performance/results/`
- [ ] Update portfolio evidence pointers in this README if needed.

Exit criteria:

- Playwright safe/quick suites are green
- k6 lite (and optionally gate) has expected pass/fail signals documented
- Allure + Grafana evidence is available for reviewer walkthrough

## 17. Portfolio Summary (TH/EN)

### Thai (for CV / Portfolio)

QA Automation Portfolio Project: ออกแบบและพัฒนาระบบทดสอบอัตโนมัติแบบครบวงจรสำหรับ Robot Store โดยครอบคลุม UI, API, Integration, Security และ Accessibility ด้วย Playwright + TypeScript พร้อมระบบ Performance Testing ด้วย k6 และการมอนิเตอร์ผ่าน Prometheus/Grafana. โครงการนี้มีการจัดโครงสร้าง environment ให้รองรับทั้ง local และ production อย่างปลอดภัย, สร้าง quality gates สำหรับ CI, และจัดทำรายงานผลผ่าน Allure เพื่อให้ทีมสามารถตรวจสอบคุณภาพและวิเคราะห์ปัญหาได้อย่างเป็นระบบ.

### English (for CV / Portfolio)

Built an end-to-end QA automation portfolio project for a Robot Store sandbox using Playwright + TypeScript across UI, API, integration, security, and accessibility layers, with k6 for performance testing and Prometheus/Grafana for runtime observability. Implemented environment-safe test execution for local and hosted targets, CI quality gates, and Allure reporting to provide reproducible quality evidence and clear debugging signals for reviewers and engineering teams.

### Short bullet version

- Designed a full-stack QA automation framework (Playwright + k6) with CI gates, Allure reporting, and Grafana observability.
- Implemented safe local/production test targeting with deterministic seed/reset workflows.
- Delivered reproducible smoke/regression/performance evidence for portfolio-grade review.
