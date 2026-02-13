# k6 Performance Test Case Summary

- Total scripts: 10
- Total grouped flow blocks: 25
- Total validation checks: 71
- Scope: `performance/scripts/*.k6.js`

## Script Catalog

### performance/scripts/auth.k6.js

- Overview: Performance checks for authentication session flow using login and post-login profile access.
- Summary: Measures auth gate stability under ramping load, tracking successful logins, auth redirects, and unexpected session failures.
- Flow: Login -> access /profile -> classify success vs auth rejection under ramping load.
- Business logic: Session gate reliability for all downstream commerce journeys.
- Flow blocks (2): Login, Profile Access
- Validation checks (3): login status is 200/302/303; login not redirected back to /login; profile is accessible after login
- Key endpoints: /login, /profile

### performance/scripts/breakpoint.k6.js

- Overview: Arrival-rate breakpoint test to find maximum sustainable throughput on a lightweight catalog endpoint.
- Summary: Ramps request rate in stages and records latency/failure inflection points to estimate practical capacity headroom.
- Flow: Drive increasing arrival-rate against /api/products -> track latency/fail inflection by rate band.
- Business logic: Capacity planning: find sustainable throughput and safe operating headroom.
- Flow blocks (0): none (single-path iteration)
- Validation checks (3): status is 200; response time < 5s; returns JSON payload
- Key endpoints: /api/products

### performance/scripts/browse.k6.js

- Overview: Visitor browse performance journey covering home page, product list API, and product detail API.
- Summary: Validates response contract and latency behavior for read-heavy catalog interactions under a ramping traffic profile.
- Flow: Visit home -> fetch product list -> fetch product detail in each iteration.
- Business logic: Read-heavy catalog availability and contract integrity under load.
- Flow blocks (3): Visit Home Page, Browse Product Catalog, View Product Details
- Validation checks (10): home status is 200; home has html content; catalog status is 200; catalog returns json; catalog payload has ok=true; catalog payload has products array; detail status is 200; detail returns json; detail payload has ok=true; detail payload contains product.id
- Key endpoints: /api/products

### performance/scripts/cart.k6.js

- Overview: Cart performance test for add-to-cart writes and cart read consistency under concurrent shopper traffic.
- Summary: Tracks successful adds versus controlled stock rejections while ensuring cart APIs stay responsive and free of server errors.
- Flow: Optionally reset stock -> add item to cart -> read cart payload for consistency.
- Business logic: Write/read cart durability with controlled stock rejection handling.
- Flow blocks (2): Add Item to Cart, View Cart
- Validation checks (4): cart add handled; cart add no 5xx; view cart status is 200; view cart returns json
- Key endpoints: /api/cart/add

### performance/scripts/checkout.k6.js

- Overview: Spike-oriented checkout performance test for the critical buyer path from auth to mock payment completion.
- Summary: Assesses checkout resilience during flash-sale load, including cart setup, auth recovery, and expected stock-based rejections.
- Flow: Authenticate (or auto-register) -> add cart item -> execute mock checkout under spike.
- Business logic: Checkout critical path resilience with business-valid 400 stock outcomes.
- Flow blocks (3): Authenticate, Setup: Add to Cart, Checkout Action
- Validation checks (11): login status is allowed (200/302/303); login does not redirect back to /login; profile is accessible after login; register status is allowed (200/302/303); register does not loop back to /register; cart add handled; cart add no 5xx; checkout status is 200 or 400; checkout has no server error; successful checkout has orderId; successful checkout has status=success
- Key endpoints: /api/products, /api/cart/add, /order/api/mock-pay, /login, /profile, /register

### performance/scripts/load.k6.js

- Overview: Configurable end-to-end load journey combining login, browse, cart add, and mock checkout actions.
- Summary: Compares balanced versus acceptance run modes while monitoring full-journey completion and stage-level latency trends.
- Flow: Login -> browse -> add cart -> checkout as a full customer journey loop.
- Business logic: End-to-end journey quality in balanced vs acceptance threshold modes.
- Flow blocks (4): Login, Browse, Cart, Checkout
- Validation checks (7): login status is 200/302/303; login not redirected back to /login; cart handled; cart no 5xx; checkout status is 200/400; checkout has no 5xx; checkout success has orderId
- Key endpoints: /api/cart/add, /order/api/mock-pay, /login

### performance/scripts/race-condition.k6.js

- Overview: Concurrency stress test focused on overselling protection when many users checkout the same product simultaneously.
- Summary: Verifies contention handling by expecting mixed success/rejection outcomes without 5xx errors or inconsistent checkout behavior.
- Flow: Shared product target -> concurrent cart add + near-simultaneous checkout attempts.
- Business logic: Overselling prevention and controlled contention behavior at checkout.
- Flow blocks (3): Authenticate, Add to Cart, Concurrent Checkout
- Validation checks (7): race login status is 200/302/303; race login not redirected back to /login; race profile is accessible; race cart add handled; race cart add no 5xx; race checkout handled; race checkout no 5xx
- Key endpoints: /api/products, /api/cart/add, /order/api/mock-pay, /login, /profile

### performance/scripts/smoke.k6.js

- Overview: Fast smoke performance probe for core availability of home and products API endpoints.
- Summary: Acts as preflight validation before heavier workloads by checking status, payload shape, and basic latency thresholds.
- Flow: Quick health pass on home and /api/products before heavier workloads.
- Business logic: Fast go/no-go signal for platform availability and baseline latency.
- Flow blocks (2): Home Page, Product API
- Validation checks (6): home status is 200; home content type is html; products status is 200; products content type is json; products payload has ok=true; products payload has array
- Key endpoints: /api/products

### performance/scripts/soak.k6.js

- Overview: Long-duration soak test for endurance stability across browse, cart, and checkout operations.
- Summary: Monitors drift over time, including early-vs-late response trends, auth durability, and accumulation of unexpected failures.
- Flow: Long-run authenticated loop of browse/cart/checkout with drift tracking over time windows.
- Business logic: Endurance stability and long-run degradation detection.
- Flow blocks (3): Browse, Cart, Checkout
- Validation checks (10): soak login status is 200/302/303; soak login not redirected back to /login; soak profile is accessible; soak browse status is 200; soak browse returns json; soak cart add handled; soak cart add no 5xx; soak checkout handled; soak checkout no 5xx; soak checkout success has orderId
- Key endpoints: /api/products, /api/cart/add, /order/api/mock-pay, /login, /profile

### performance/scripts/stress.k6.js

- Overview: Stress workload with weighted browse/cart/checkout mix to locate degradation under rising pressure.
- Summary: Tracks performance decay and error concentration while preserving expected business rejections from stock and cart guards.
- Flow: Weighted operation mix (browse/cart/checkout) while VUs ramp to uncover degradation points.
- Business logic: Breaking-point discovery with expected business rejections separated from true failures.
- Flow blocks (3): Browse, Cart, Checkout
- Validation checks (10): stress login status is 200/302/303; stress login not redirected to /login; stress profile is accessible; browse successful; browse returns json; cart add handled; cart add no 5xx; checkout status is handled; checkout no 5xx; checkout success has orderId
- Key endpoints: /api/products, /api/cart/add, /order/api/mock-pay, /login, /profile

