# Performance Testing with k6

This directory contains k6 performance scripts for the Robot Store project.
The goal is to provide reproducible load evidence and portfolio-ready test artifacts.

## Hiring Snapshot

- Last verified full rerun: `February 9, 2026`
- Primary evidence:
  - `performance/results/20260209-121019-portfolio/manifest.md`
  - `performance/results/20260209-122753-gate/manifest.md`
- Coverage includes `smoke`, `auth`, `browse`, `cart`, `race`, `checkout`, `load`, `stress`, `soak`, `breakpoint`
- Current bottlenecks observed under load:
  - Checkout strict path instability (unexpected/server-error outcomes)
  - Elevated p95 latency in stress/soak quick modes

## Scope

The suite covers these categories:

- Smoke: basic service health check
- Auth: session and login stability
- Browse: read-heavy catalog usage
- Cart: write path and stock-guard behavior
- Checkout: critical payment path under spike
- Race condition: concurrent checkout contention
- Load: end-to-end customer journey
- Stress: degradation under increasing concurrency
- Soak: stability over longer runtime
- Breakpoint: capacity discovery under arrival-rate load

## Directory Layout

- `performance/scripts/`: k6 test scripts (`*.k6.js`)
- `performance/scenarios/`: reusable scenario profiles
- `performance/thresholds/`: shared threshold presets
- `performance/lib/`: config, headers, shared helpers
- `performance/data/`: input data (`users.csv`, `products.csv`)
- `performance/results/`: generated artifacts from suite and k6 runs

## Prerequisites

1. Install k6
   - Windows: `winget install k6` or `choco install k6`
   - macOS: `brew install k6`
2. Configure environment in `.env`
   - `PERF_BASE_URL` (recommended target override for k6)
   - `REAL_URL` (legacy alias, optional)
   - `BASE_URL` (fallback shared with Playwright)
3. Optional but recommended for stable checkout/load runs
   - `RESET_KEY` for stock reset endpoint
   - or DB access for `npm run setup:stock`

## Test Modes

### Checkout mode (`performance/scripts/checkout.k6.js`)

- `CHECKOUT_MODE=strict` (default)
  - Enforces checkout endpoint quality gates
- `CHECKOUT_MODE=acceptance`
  - Measurement-focused mode for unstable/shared environments

Commands:

- Strict: `npm run test:perf:checkout`
- Acceptance: `npm run test:perf:checkout-acceptance`

### Load mode (`performance/scripts/load.k6.js`)

- `TEST_MODE=balanced` (default)
  - Enforces thresholds and now fails fast if no in-stock target is available
- `TEST_MODE=acceptance`
  - Measurement-only mode without strict threshold gating

Commands:

- Balanced: `npm run test:perf:load`
- Acceptance: `npm run test:perf:load-acceptance`

### Quick toggles for long tests

- Stress quick: `STRESS_QUICK=true`
- Soak quick: `SOAK_QUICK=true`

## Recommended Run Order

1. `npm run test:perf:smoke`
2. `npm run test:perf:auth`
3. `npm run test:perf:browse`
4. `npm run test:perf:cart`
5. `npm run test:perf:race`
6. `npm run test:perf:checkout-acceptance` (or strict when environment is stable)
7. `npm run test:perf:load-acceptance` (or balanced after stock reset)
8. `npm run test:perf:stress`
9. `npm run test:perf:soak`
10. `npm run test:perf:breakpoint`

Before running, confirm resolved targets:

- `npm run env:targets`

## Stock Preparation

Option A: API reset (if supported by target env)

- Set `PERF_RESET_STOCK=true`
- Set `RESET_KEY=<your-reset-key>`
- `run-perf-suite` enables this automatically for stock-sensitive scripts:
  - `cart`, `race`, `checkout-*`, `load-*`, `stress-*`, `soak-*`

Option B: direct DB setup

- `npm run setup:stock`

## Portfolio Artifact Collection

A sequential suite runner is available and stores a timestamped evidence bundle.

Commands:

- Portfolio profile: `npm run test:perf:suite`
- Gate profile: `npm run test:perf:suite:gate`

Output:

- `performance/results/<timestamp-profile>/manifest.json`
- `performance/results/<timestamp-profile>/manifest.md`
- `performance/results/<timestamp-profile>/*.summary.json`
- `performance/results/<timestamp-profile>/*.log.txt`
- `performance/results/latest.txt`

`manifest.md` is the primary file for submission and quick review.

## Single Script Summary Export

You can still export a single script summary manually:

```bash
node scripts/run-k6.js performance/scripts/smoke.k6.js --summary-export performance/results/smoke.summary.json
```

## Allure Note

Allure reporting in this repository is focused on Playwright tests.
Use `performance/results/` artifacts as the source of truth for k6 evidence.

## Latest Verification Snapshot

Last full rerun date: `February 9, 2026`

- Portfolio profile: `performance/results/20260209-121019-portfolio/manifest.md`
- Gate profile: `performance/results/20260209-122753-gate/manifest.md`
- Latest pointer: `performance/results/latest.txt`

## Known Issues (From Latest Runs)

- `checkout-strict` can fail in shared environments due to checkout endpoint instability under spike load.
  - Evidence: `checkout_unexpected count=9`, `http_req_duration{endpoint:checkout_mock_pay} p(95)=5.28s`, `http_req_failed{endpoint:checkout_mock_pay} rate=2.49%`
  - Source: `performance/results/20260209-122753-gate/checkout-strict.log.txt`
- `stress-quick` breached response-time gate in both profiles.
  - Evidence:
    - portfolio: `http_req_duration p(95)=3.9s` vs threshold `<3.0s`
    - gate: `http_req_duration p(95)=4.01s` vs threshold `<3.0s`
  - Source:
    - `performance/results/20260209-121019-portfolio/stress-quick.log.txt`
    - `performance/results/20260209-122753-gate/stress-quick.log.txt`
- `soak-quick` breached response-time gate in both profiles.
  - Evidence:
    - portfolio: `http_req_duration p(95)=1.53s` vs threshold `<1.5s`
    - gate: `http_req_duration p(95)=1.82s` vs threshold `<1.5s`
  - Source:
    - `performance/results/20260209-121019-portfolio/soak-quick.log.txt`
    - `performance/results/20260209-122753-gate/soak-quick.log.txt`

These are intentionally retained as transparent evidence.
Do not relax strict thresholds for gate runs unless the business SLA is redefined.
