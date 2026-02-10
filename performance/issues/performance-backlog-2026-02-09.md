# Performance Backlog (Draft Tickets)

Date: `February 9, 2026`
Evidence source:

- `performance/results/20260209-121019-portfolio/manifest.md`
- `performance/results/20260209-122753-gate/manifest.md`

## 1. Checkout Strict Fails Under Spike (Concurrency/Error Handling)

- Suggested title: `PERF: Stabilize checkout mock-pay behavior under spike load`
- Severity: `High`
- Environment: `robot-store-sandbox.onrender.com`
- Impact:
  - Checkout critical path breaches strict quality gates
  - Gate profile cannot pass reliably
- Evidence:
  - `checkout_unexpected count=9` (expected `count==0`)
  - `http_req_duration{endpoint:checkout_mock_pay} p(95)=5.28s` (expected `<1.0s`)
  - `http_req_failed{endpoint:checkout_mock_pay} rate=2.49%` (expected `0%`)
  - `performance/results/20260209-122753-gate/checkout-strict.log.txt`
- Reproduce:
  1. `npm run test:perf:suite:gate`
  2. Open `performance/results/<run-id>-gate/checkout-strict.log.txt`
- Expected:
  - No unexpected checkout outcomes in strict mode
  - `checkout_mock_pay` p95 under threshold and 0% failed requests
- Actual:
  - Unexpected outcomes and endpoint-level failures under spike
- Done criteria:
  - `checkout-strict` passes in at least 3 consecutive gate runs
  - No `checkout_unexpected` increments across those runs

## 2. Stress Quick p95 Latency Exceeds SLA

- Suggested title: `PERF: Reduce stress-mode p95 latency below 3s`
- Severity: `High`
- Environment: `robot-store-sandbox.onrender.com`
- Impact:
  - Stress profile fails in both portfolio and gate runs
  - Indicates degraded user experience under higher concurrency
- Evidence:
  - Portfolio: `http_req_duration p(95)=3.9s` (expected `<3.0s`)
    - `performance/results/20260209-121019-portfolio/stress-quick.log.txt`
  - Gate: `http_req_duration p(95)=4.01s` (expected `<3.0s`)
    - `performance/results/20260209-122753-gate/stress-quick.log.txt`
- Reproduce:
  1. `STRESS_QUICK=true npm run test:perf:stress`
  2. Check threshold section for `http_req_duration`
- Expected:
  - `p(95) < 3000ms` and `p(99) < 5000ms`
- Actual:
  - `p(95)` exceeds 3000ms
- Done criteria:
  - Stress thresholds pass for 3 consecutive reruns

## 3. Soak Quick p95 Latency Exceeds SLA

- Suggested title: `PERF: Improve long-run stability to keep soak p95 under 1.5s`
- Severity: `Medium-High`
- Environment: `robot-store-sandbox.onrender.com`
- Impact:
  - Soak profile indicates sustained performance degradation
  - Affects confidence in long-duration stability
- Evidence:
  - Portfolio: `http_req_duration p(95)=1.53s` (expected `<1.5s`)
    - `performance/results/20260209-121019-portfolio/soak-quick.log.txt`
  - Gate: `http_req_duration p(95)=1.82s` (expected `<1.5s`)
    - `performance/results/20260209-122753-gate/soak-quick.log.txt`
- Reproduce:
  1. `SOAK_QUICK=true npm run test:perf:soak`
  2. Check threshold section for `http_req_duration`
- Expected:
  - `p(95) < 1500ms` and `p(99) < 3000ms`
- Actual:
  - `p(95)` exceeds 1500ms
- Done criteria:
  - Soak thresholds pass for 3 consecutive reruns
