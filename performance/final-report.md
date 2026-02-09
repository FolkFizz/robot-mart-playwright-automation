# k6 Final Performance Report

Date: `February 9, 2026`
Target: `https://robot-store-sandbox.onrender.com`

## Commands Executed

- `npm run test:perf:suite`
- `npm run test:perf:suite:gate`

## Evidence Artifacts

- Portfolio manifest: `performance/results/20260209-121019-portfolio/manifest.md`
- Gate manifest: `performance/results/20260209-122753-gate/manifest.md`
- Latest run pointer: `performance/results/latest.txt`

## Run Summary

| Profile | Run ID | Result | Failed Runs |
| --- | --- | --- | --- |
| portfolio | `20260209-121019-portfolio` | FAIL | `2/10` |
| gate | `20260209-122753-gate` | FAIL | `3/10` |

## Failing Scenarios

1. `checkout-strict` (gate)
- Threshold breaches:
  - `checkout_unexpected count=9` (expected `count==0`)
  - `http_req_duration{endpoint:checkout_mock_pay} p(95)=5.28s` (expected `<1.0s`)
  - `http_req_failed{endpoint:checkout_mock_pay} rate=2.49%` (expected `0%`)
- Source: `performance/results/20260209-122753-gate/checkout-strict.log.txt`

2. `stress-quick` (portfolio and gate)
- Threshold breach:
  - portfolio: `http_req_duration p(95)=3.9s` (expected `<3.0s`)
  - gate: `http_req_duration p(95)=4.01s` (expected `<3.0s`)
- Sources:
  - `performance/results/20260209-121019-portfolio/stress-quick.log.txt`
  - `performance/results/20260209-122753-gate/stress-quick.log.txt`

3. `soak-quick` (portfolio and gate)
- Threshold breach:
  - portfolio: `http_req_duration p(95)=1.53s` (expected `<1.5s`)
  - gate: `http_req_duration p(95)=1.82s` (expected `<1.5s`)
- Sources:
  - `performance/results/20260209-121019-portfolio/soak-quick.log.txt`
  - `performance/results/20260209-122753-gate/soak-quick.log.txt`

## Interpretation

- The suite orchestration and data collection are stable and reproducible.
- Failures are runtime-quality signals under load, not script execution failures.
- Main bottleneck area is checkout/payment path latency and error behavior under concurrency.

## Recommended Follow-up

1. Keep `portfolio` and `gate` as separate quality views in the project narrative.
2. Open backend tickets for checkout concurrency/error handling using the logs above.
3. Re-run the same two commands after backend fixes and compare manifests by run ID.

## Ticket Drafts

- Backlog-ready issue drafts are prepared in:
  - `performance/issues/performance-backlog-2026-02-09.md`
