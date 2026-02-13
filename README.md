# Robot Store Playwright Automation

<!-- nav-toc:start -->
[English](README.md) | [ภาษาไทย](README_TH.md)

## Table of Contents
- [1. What This Repo Covers](#sec-01)
- [2. Tech Stack](#sec-02)
- [3. Prerequisites](#sec-03)
- [4. Environment Strategy](#sec-04)
- [5. Run Modes](#sec-05)
- [6. Test Architecture](#sec-06)
- [7. Test Taxonomy and Tags](#sec-07)
- [8. Command Reference](#sec-08)
- [9. Accessibility and Allure](#sec-09)
- [10. Performance Monitoring (Prometheus + Grafana)](#sec-10)
- [11. CI/CD Coverage](#sec-11)
- [12. Performance Evidence Snapshot](#sec-12)
- [13. Known Limitations and Trade-offs](#sec-13)
- [14. Troubleshooting](#sec-14)
- [15. Portfolio Reviewer Path](#sec-15)
- [16. Final QA Checklist (Project Close-Out)](#sec-16)

## Documentation Index
- [Main README (English)](README.md)
- [Main README (ภาษาไทย)](README_TH.md)
- [Playwright Test Case Summary (English)](docs/PLAYWRIGHT_TEST_CASE_SUMMARY.md)
- [Playwright Test Case Summary (ภาษาไทย)](docs/PLAYWRIGHT_TEST_CASE_SUMMARY_TH.md)
- [k6 Test Case Summary (English)](docs/K6_TEST_CASE_SUMMARY.md)
- [k6 Test Case Summary (ภาษาไทย)](docs/K6_TEST_CASE_SUMMARY_TH.md)
<!-- nav-toc:end -->

The single source of truth for this repository.
This project combines Playwright (functional) and k6 (performance) testing for the Robot Store sandbox app.

<a id="sec-01"></a>
## 1. What This Repo Covers

- UI, API, integration, security, and a11y tests with Playwright
- Performance and load tests with k6
- Safe production smoke checks (`@smoke`, `@safe`)
- Local deterministic test setup with reset/seed hooks

<a id="sec-02"></a>
## 2. Tech Stack

- Node.js + TypeScript
- Playwright (`@playwright/test`)
- k6
- Prometheus + Grafana (optional — k6 live monitoring stack)
- Allure (`allure-playwright`, `allure-commandline`)
- axe (`@axe-core/playwright`)
- ESLint + Prettier
- PostgreSQL client (`pg`)

<a id="sec-03"></a>
## 3. Prerequisites

1. Install dependencies:

```bash
npm install
```

2. Set up environment profiles:

- Copy `.env.local.example` → `.env.local`
- Copy `.env.prod.example` → `.env.prod`
- Activate a profile:

```bash
npm run env:use:local
# or
npm run env:use:prod
```

3. For local mode: run the companion app (`robot-store-sandbox`) at `http://localhost:3000`.

4. For performance tests: install k6.

5. Optional (live k6 monitoring dashboard): Docker Desktop or Docker Engine.

<a id="sec-04"></a>
## 4. Environment Strategy

### Profiles

- `.env.local`
  - `APP_BASE_URL=http://localhost:3000`
  - `K6_BASE_URL=...` — optional k6-only override; leave empty to reuse `APP_BASE_URL`
  - `DATABASE_URL` — required for direct-DB integration checks and fallback seeding
  - Recommended: Docker Postgres URL (`postgresql://postgres:password_local_docker@localhost:5433/robot_store_sandbox`)
  - `SEED_DATA=true` for deterministic local runs

- `.env.prod`
  - `APP_BASE_URL=https://robot-store-sandbox.onrender.com`
  - `K6_BASE_URL=...` — optional k6-only override; set only when the perf target differs from the Playwright target
  - `DATABASE_URL` — should point to Neon/production branch
  - Intended for hosted safe checks
  - `SEED_DATA=false`

### URL Resolution

Playwright target:
1. `APP_BASE_URL`
2. fallback: `http://localhost:3000`

k6 target:
1. `K6_BASE_URL`
2. `APP_BASE_URL`
3. fallback: `http://localhost:3000`

Legacy vars from older versions (`BASE_URL`, `PERF_BASE_URL`, `REAL_URL`) are still read as fallbacks so old scripts keep working. For new setups, use only:

- `APP_BASE_URL` — main shared target
- `K6_BASE_URL` — optional k6-only override

Inspect active targets:

```bash
npm run env:targets
```

### Safety Rules

- Destructive hooks (`/api/test/reset`, `/api/test/seed`) are allowed only on localhost by default.
- Privileged stock-mutation tests are skipped on hosted targets by default.
- Override only when intentional:

```
ALLOW_DESTRUCTIVE_TEST_HOOKS=true
```

<a id="sec-05"></a>
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

This single command starts the full local stack (app + DB + mailpit).

Stop the stack:

```bash
docker compose down
```

Reset the local DB volume:

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

`test:prod` runs only `@smoke` and `@safe` tests.

### Local vs Production Test Matrix

**Playwright:**

| Scope | Recommended target | Commands |
| --- | --- | --- |
| Full/active development coverage | Local (`APP_BASE_URL=http://localhost:3000`) | `npm run test`, `npm run test:regression`, `npm run test:api`, `npm run test:a11y`, `npm run test:quick-regression`, `npm run test:quick-regression:stable` |
| Lightweight hosted sanity check | Production (`APP_BASE_URL=https://...onrender.com`) | `npm run test:prod`, `npm run test:smoke` |
| Stock-mutation / privileged checks | Local by default (hosted requires explicit override) | `tests/api/admin.api.spec.ts`, `tests/integration/product-cart.int.spec.ts` |

**k6:**

| Scope | Recommended target | Commands |
| --- | --- | --- |
| Low-risk hosted perf smoke | Production (`K6_BASE_URL` empty — follows `APP_BASE_URL`) | `npm run test:perf:smoke`, `npm run test:perf:auth`, `npm run test:perf:browse`, `npm run test:perf:breakpoint`, `npm run test:perf:suite:lite` |
| Write-heavy / capacity profiling | Local | `npm run test:perf:cart`, `npm run test:perf:checkout`, `npm run test:perf:checkout-acceptance`, `npm run test:perf:race`, `npm run test:perf:load`, `npm run test:perf:load-acceptance`, `npm run test:perf:stress`, `npm run test:perf:soak`, `npm run test:perf:suite`, `npm run test:perf:suite:gate` |

**Notes:**
- `K6_BASE_URL` is optional. Leave it empty to reuse `APP_BASE_URL`.
- Some Playwright integration flows read `DATABASE_URL` directly. Keep it aligned with the active environment (`local Docker DB` for local runs, `Neon prod` for hosted checks).

<a id="sec-06"></a>
## 6. Test Architecture

### Layering

1. `tests/**` — owns flow and assertions; keep specs readable and intent-focused
2. `src/pages/**` — Page Objects: selectors and UI interactions
3. `src/fixtures/**` — typed shared setup/context (API, auth, seed lifecycle)
4. `src/test-support/**` — cross-spec helpers
5. `src/api/**` — reusable API clients and request wrappers
6. `src/config/**`, `src/data/**` — env, routes, constants, test data
7. `performance/**` — k6 shared libraries, scenarios, thresholds, scripts

### Repository Structure

```text
src/
tests/
performance/
scripts/
docs/
monitoring/
assets/
.github/workflows/
```

<a id="sec-07"></a>
## 7. Test Taxonomy and Tags

### Taxonomy

- Functional: `tests/api`, `tests/integration`, `tests/e2e`
- Non-functional: `tests/a11y`, `tests/security`
- Performance: `performance/scripts/*.k6.js`

### Core Tags

| Tag | Description |
| --- | --- |
| `@smoke` | Fast, high-signal checks |
| `@regression` | Broader coverage |
| `@api` | API-layer tests |
| `@a11y` | Accessibility tests |
| `@security` | Security tests |
| `@ai-mock` | Deterministic chatbot checks — no external LLM quota consumed |
| `@ai-live` | Low-volume live canary checks — quota-budgeted |

### Safety Tags

| Tag | Description |
| --- | --- |
| `@safe` | Read-only; non-destructive |
| `@destructive` | Mutates data (seed/reset/checkout/admin writes) |

### AI Test Lanes

**`@ai-mock` lane:**
- Default lane for chatbot suites
- Expects deterministic backend responses (price, stock, safety) without consuming Gemini live quota

**`@ai-live` lane:**
- Small canary-only live suite
- Gated by a daily budget script before execution
- Runs with `--workers=1` to avoid burst requests

<a id="sec-08"></a>
## 8. Command Reference

### Playwright

```bash
npm run pw:test
npm run test
npm run test:smoke
npm run test:regression
npm run test:api
npm run test:a11y
npm run test:quick-regression
npm run test:quick-regression:stable
npm run test:prod
npm run test:ai:mock
npm run test:ai:live
npm run ai:budget:report
npm run ai:budget:check
npm run ai:budget:consume
```

Run a single file:

```bash
npx playwright test tests/e2e/catalog.e2e.spec.ts --project=chromium
```

Run by tag:

```bash
npx playwright test --grep "@smoke"
```

### Quality Gates

```bash
npm run format
npm run format:check
npm run typecheck
npm run lint
npm run lint:fix
npm run ci:quality
npm run ci:quick
```

### Metrics Utilities

```bash
npm run metrics:playwright -- --input test-results/quick-regression.json
```

### Reporting

```bash
npm run allure:clean
npm run report:allure
npm run report:open
npm run report:snapshots
```

### Environment and Stock Utilities

```bash
npm run env:use:local
npm run env:use:prod
npm run env:targets
npm run setup:stock
npm run stock:reset
npm run stock:reset:local
npm run stock:reset:prod
```

### k6

```bash
npm run k6:run -- performance/scripts/smoke.k6.js
npm run test:perf:smoke
npm run test:perf:auth
npm run test:perf:browse
npm run test:perf:cart
npm run test:perf:checkout
npm run test:perf:checkout-acceptance
npm run test:perf:race
npm run test:perf:load
npm run test:perf:load-acceptance
npm run test:perf:stress
npm run test:perf:soak
npm run test:perf:breakpoint
npm run test:perf:suite
npm run test:perf:suite:lite
npm run test:perf:suite:gate
npm run test:perf:smoke:monitor
npm run test:perf:suite:monitor
npm run test:perf:suite:gate:monitor
npm run monitor:up
npm run monitor:status
npm run monitor:logs
npm run monitor:down
npm run monitor:down:volumes
```

### Docker

```bash
docker compose run --rm qa-playwright
docker compose run --rm qa-k6
docker compose -f docker-compose.monitor.yml up -d
```

For container → local app testing:

```bash
APP_BASE_URL=http://host.docker.internal:3000
```

<a id="sec-09"></a>
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

<a id="sec-10"></a>
## 10. Performance Monitoring (Prometheus + Grafana)

This repo ships a ready-to-run local monitoring stack for k6:

- Prometheus ingests k6 metrics via remote write
- Grafana auto-provisions its datasource and dashboard on startup
- Dashboard is versioned at `monitoring/grafana/dashboards/k6-overview.json`

Start the stack:

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

Open the dashboards:

- Grafana: `http://localhost:3001` (default credentials: `admin` / `admin`)
- Prometheus: `http://localhost:9090`

Stop the stack:

```bash
npm run monitor:down
```

**Notes:**
- Grafana runs on port `3001` to avoid conflicting with the local app on `3000`.
- This stack complements Allure — it does not replace it. Allure covers Playwright functional results; Prometheus/Grafana covers k6 runtime metrics.

### Visual Gallery (Allure + Grafana + Prometheus)

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

**Notes:**
- Snapshots are saved to `assets/readme/`.
- If a service is unavailable, the snapshot script writes a clean placeholder so the README never breaks.
- Optional env overrides: `GRAFANA_URL`, `GRAFANA_DASHBOARD_URL`, `GRAFANA_USER`, `GRAFANA_PASSWORD`, `PROMETHEUS_URL`, `PROMETHEUS_GRAPH_URL`

<a id="sec-11"></a>
## 11. CI/CD Coverage

### Active Workflows

| Workflow | Description |
| --- | --- |
| `quick-regression.yml` | `ci:quality` + quick smoke/regression subset |
| `ui-smoke.yml` | Safe UI, security, and a11y slice |
| `api.yml` | API smoke and security slice |
| `a11y.yml` | Accessibility smoke slice |
| `ai-live-manual.yml` | Manual low-volume live AI canary (`@ai-live`) with daily budget gate |
| `regression-nightly.yml` | Wider regression subset |
| `k6-nightly.yml` | Performance gate suite |

### Common CI Defaults

- `@chat` and `@ai` tests are excluded from routine runs
- `@ai-live` is reserved for manual/controlled runs with the budget gate (`npm run test:ai:live`)
- Destructive tests are excluded from PR-safe paths
- Artifacts uploaded: `playwright-report`, `test-results`, `allure-*`, `performance/results/*`
- Nightly schedules run only when the repo variable `ENABLE_NIGHTLY=true`
- `k6-nightly` defaults to the `lite` profile to reduce hosted DB load; manual dispatch supports `gate` and `portfolio`

<a id="sec-12"></a>
## 12. Performance Evidence Snapshot

Latest committed evidence:

- Portfolio manifest: `performance/results/20260209-121019-portfolio/manifest.md`
- Gate manifest: `performance/results/20260209-122753-gate/manifest.md`
- Latest pointer (generated by perf-suite runs and may be absent in committed snapshots): `performance/results/latest.txt`

**Observed bottlenecks from the latest gate/portfolio run:**

- `checkout-strict` — unexpected outcomes and elevated latency under spike load
- `stress-quick` — p95 response time above threshold
- `soak-quick` — p95 response time above threshold under sustained load

**Open work items:**

1. Stabilize checkout under concurrency (`checkout-strict` gate failures)
2. Reduce stress p95 latency to meet threshold target
3. Improve soak p95 stability over sustained duration

<a id="sec-13"></a>
## 13. Known Limitations and Trade-offs

- `@chat`/`@ai` tests are excluded from routine CI due to external dependency variance and cost unpredictability.
- k6 thresholds may fail in shared hosted environments where runtime and network conditions vary.
- Destructive test paths are intentionally constrained to minimize production risk.

<a id="sec-14"></a>
## 14. Troubleshooting

### 403 on `/api/test/reset`

Likely causes:

- Target is a hosted environment where destructive hooks are disabled
- Incorrect `TEST_API_KEY` or `RESET_KEY`
- Backend test hooks not enabled for this environment

### Checkout or perf failures due to low stock

Reset stock before running stock-sensitive tests:

```bash
npm run stock:reset:local
# or
npm run stock:reset:prod
```

### Allure generation is slow or stuck

Clear old artifacts first:

```bash
npm run allure:clean
npm run test:smoke
npm run report:allure
```

<a id="sec-15"></a>
## 15. Portfolio Reviewer Path

For the fastest reproducible review:

```bash
npm install
npm run env:use:prod
npm run ci:quality
npm run test:smoke
npm run report:allure
```

This sequence validates code quality, smoke stability, and report generation with minimal setup overhead.

<a id="sec-16"></a>
## 16. Final QA Checklist (Project Close-Out)

Run through this checklist before declaring the project complete.

**Environment**
- [ ] Activate and verify the target profile:
  - `npm run env:use:local` or `npm run env:use:prod`
  - `npm run env:targets`

**Local stack** (when testing locally)
- [ ] Start the stack in `robot-store-sandbox`: `docker compose up -d`
- [ ] Confirm the app is reachable at `http://localhost:3000`

**Quality and regression**
- [ ] Quality gates pass: `npm run ci:quality`
- [ ] Core regression passes (Chromium, safe slice): `npm run ci:quick`
- [ ] Hosted safe check passes: `npm run test:prod`

**Reporting**
- [ ] Functional report generated: `npm run report:allure`

**Performance**
- [ ] Performance suite passes (local preferred for heavy profiles):
  - `npm run test:perf:suite:lite`
  - `npm run test:perf:suite:gate` _(optional — for capacity evidence)_
- [ ] Monitoring evidence captured (k6 + Grafana):
  - Start stack: `npm run monitor:up`
  - Capture snapshots: `npm run report:snapshots`
  - Archive dashboard/result artifacts under `performance/results/`

**CI**
- [ ] All active workflows show at least one green run:
  - `quick-regression`, `ui-smoke`, `api`, `a11y`, `regression-nightly`, `k6-nightly`

**Housekeeping**
- [ ] Remove temporary local-only result files from `performance/results/` before committing
- [ ] Update portfolio evidence pointers in this README if needed

### Exit Criteria

- Playwright safe/quick suites are green
- k6 lite (and optionally gate) results are documented with clear pass/fail signals
- Allure and Grafana evidence is available for reviewer walkthrough