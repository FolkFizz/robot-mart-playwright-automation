# Playwright Test Case Summary

- Total suites: 29
- Total test cases: 303
- Positive cases: 114
- Negative cases: 100
- Edge cases: 89
- Scope: `tests/**/*.spec.ts`

## Legend (P/N/E)

- `P` = Positive case: happy path / expected success behavior
- `N` = Negative case: invalid input / forbidden path / expected rejection
- `E` = Edge case: boundary, concurrency, resilience, or uncommon scenario

## Coverage By Area

| Area | Files | Cases | Positive | Negative | Edge |
| --- | ---: | ---: | ---: | ---: | ---: |
| a11y | 3 | 29 | 13 | 7 | 9 |
| api | 6 | 44 | 17 | 16 | 11 |
| e2e | 11 | 146 | 59 | 48 | 39 |
| integration | 5 | 47 | 14 | 13 | 20 |
| security | 4 | 37 | 11 | 16 | 10 |

## Suite Catalog

### tests/a11y/cart.a11y.spec.ts (12 cases)

- Overview: Accessibility checks for the cart page covering semantics, keyboard flow, and cart action controls.
- Summary: Validates WCAG-critical behavior for item rows, quantity/remove controls, coupon form fields, and empty-cart messaging.
- Flow: Seed cart states -> open cart page -> run a11y scan + keyboard checks on quantity/remove/coupon controls.
- Business logic: WCAG 2.1 AA for cart interactions, readable labels, and safe empty/error states.

- Positive 6 cases:
  - A11Y-CART-P01: cart page has no critical violations
  - A11Y-CART-P02: cart item quantity controls accessible via keyboard
  - A11Y-CART-P03: remove item button has proper ARIA label
  - A11Y-CART-P04: cart total announced to screen readers
  - A11Y-CART-P05: coupon input field accessible with proper labels
  - A11Y-CART-P06: proceed to checkout button keyboard accessible
- Negative 3 cases:
  - A11Y-CART-N01: empty cart state maintains accessibility
  - A11Y-CART-N02: stock limit warning announced to screen readers
  - A11Y-CART-N03: invalid coupon error accessible
- Edge 3 cases:
  - A11Y-CART-E01: cart with 10+ items remains accessible
  - A11Y-CART-E02: long product names do not break screen reader announcements
  - A11Y-CART-E03: cart loading state maintains accessibility

### tests/a11y/checkout.a11y.spec.ts (10 cases)

- Overview: Accessibility checks for the checkout page and payment form interactions.
- Summary: Verifies labels, focus order, validation messaging, and payment section behavior across mock and Stripe-capable states.
- Flow: Open checkout with cart preconditions -> validate form semantics/focus order -> verify payment section accessibility states.
- Business logic: Checkout form controls must remain accessible across validation and payment rendering modes.

- Positive 6 cases:
  - A11Y-CHK-P01: checkout page has no critical violations
  - A11Y-CHK-P02: address fields have proper autocomplete attributes
  - A11Y-CHK-P03: payment method selection accessible
  - A11Y-CHK-P04: order summary section screen reader friendly
  - A11Y-CHK-P05: keyboard tab order reaches checkout form controls
  - A11Y-CHK-P06: skip link functionality
- Negative 2 cases:
  - A11Y-CHK-N01: form validation errors announced to screen readers
  - A11Y-CHK-N02: empty checkout fields block submit with browser validation
- Edge 2 cases:
  - A11Y-CHK-E01: payment loading states remain accessible
  - A11Y-CHK-E02: stripe payment element iframe accessibility

### tests/a11y/home.a11y.spec.ts (7 cases)

- Overview: Accessibility checks for the home catalog experience and global navigation landmarks.
- Summary: Covers product grid semantics, keyboard navigation, filter/search controls, and known non-blocking legacy exceptions.
- Flow: Open home catalog -> audit landmarks/controls -> validate keyboard navigation and filter/search accessibility behavior.
- Business logic: Catalog discovery controls must be keyboard/screen-reader friendly with stable landmarks.

- Positive 1 cases:
  - A11Y-HOME-P01: home page has no critical violations
- Negative 2 cases:
  - A11Y-HOME-N01: keyboard tab navigation keeps focus on visible interactive elements
  - A11Y-HOME-N02: loading state maintains accessibility
- Edge 4 cases:
  - A11Y-HOME-E01: product grid with many items remains accessible
  - A11Y-HOME-E02: search and price filter controls meet color contrast
  - A11Y-HOME-E03: search input supports keyboard submit without focus trap
  - A11Y-HOME-E04: category and sort filters accessible via keyboard

### tests/api/admin.api.spec.ts (9 cases)

- Overview: Admin API validation for privileged stock operations, notifications, and protected endpoints.
- Summary: Ensures admin-only routes enforce role checks while reset-stock and product/admin notification contracts remain stable.
- Flow: Login context (admin/user/anon) -> call admin/reset endpoints -> assert status codes and response contracts.
- Business logic: Admin-only endpoints require proper role and reset-key protection while exposing stable contracts.

- Positive 4 cases:
  - ADMIN-API-P01: reset stock safely via API
  - ADMIN-API-P02: admin notifications list returns data
  - ADMIN-API-P03: products API returns current stock levels
  - ADMIN-API-P04: stock reset returns confirmation
- Negative 3 cases:
  - ADMIN-API-N01: regular user cannot access admin endpoints
  - ADMIN-API-N02: unauthenticated access to admin API rejected
  - ADMIN-API-N03: invalid reset key rejected by reset API
- Edge 2 cases:
  - ADMIN-API-E01: admin notifications pagination handles large dataset
  - ADMIN-API-E02: concurrent stock resets handled gracefully

### tests/api/auth.api.spec.ts (9 cases)

- Overview: Authentication API checks for login outcomes and session cookie behavior.
- Summary: Confirms user/admin authentication, failed-credential handling, session persistence, and role-sensitive access boundaries.
- Flow: Submit login variants -> inspect session state/cookies -> verify downstream access control based on role.
- Business logic: Session authentication controls downstream authorization and cookie security attributes.

- Positive 4 cases:
  - AUTH-API-P01: user login creates authenticated session
  - AUTH-API-P02: admin login creates authenticated session
  - AUTH-API-P03: authenticated user session persists across requests
  - AUTH-API-P04: session cookie includes expected security attributes
- Negative 3 cases:
  - AUTH-API-N01: invalid credentials return error
  - AUTH-API-N02: empty credentials are rejected and remain unauthenticated
  - AUTH-API-N03: regular user session cannot access admin endpoint
- Edge 2 cases:
  - AUTH-API-E01: re-authentication switches role in same session context
  - AUTH-API-E02: repeated failed logins recover with later valid login

### tests/api/cart.api.spec.ts (7 cases)

- Overview: Cart API coverage for item mutation, coupon handling, and cart state retrieval.
- Summary: Validates add/update/remove flows, stock and quantity validation, and restricted shopping behavior for admin sessions.
- Flow: Mutate cart via API (add/update/remove/coupon) -> fetch cart state -> validate stock and privilege constraints.
- Business logic: Cart mutations must enforce stock and reject unauthorized shopping patterns.

- Positive 2 cases:
  - CART-API-P01: add, update, remove cart item
  - CART-API-P02: apply and remove coupon
- Negative 3 cases:
  - CART-API-N01: add invalid product ID returns error
  - CART-API-N02: quantity exceeds stock limit fails gracefully
  - CART-API-N03: negative quantity rejected
- Edge 2 cases:
  - CART-API-E01: admin user cannot add to cart
  - CART-API-E02: adding same product multiple times merges quantities

### tests/api/chat.ai-live.spec.ts (4 cases)

- Overview: Live AI chat canary tests against the real model path under quota gating.
- Summary: Checks real prompt-response quality, safety refusal behavior, and latency guardrails when RUN_AI_LIVE is enabled.
- Flow: Send live prompts to chat endpoint -> assert quality/safety behavior -> check latency against live budget.
- Business logic: Live AI path must keep useful responses, refusal safety, and acceptable latency.

- Positive 2 cases:
  - CHAT-AI-LIVE-P01: price and stock question returns answer
  - CHAT-AI-LIVE-P02: recommendation prompt returns non-empty response
- Negative 1 cases:
  - CHAT-AI-LIVE-N01: dangerous prompt remains blocked
- Edge 1 cases:
  - CHAT-AI-LIVE-E01: live latency stays under budget

### tests/api/chat.api.spec.ts (9 cases)

- Overview: Chat API contract tests for normal prompts, safety blocking, and endpoint robustness.
- Summary: Verifies reply schema stability, refusal behavior for risky prompts, and reliability under empty, concurrent, and latency scenarios.
- Flow: Send normal + risky + edge payloads -> validate reply contract and block behavior -> check concurrency/latency stability.
- Business logic: Chat API must preserve response schema and refuse unsafe prompts without instability.

- Positive 3 cases:
  - CHAT-API-P01: normal prompt returns non-empty reply
  - CHAT-API-P02: multilingual prompt returns non-empty reply
  - CHAT-API-P03: form-urlencoded payload (widget style) works
- Negative 3 cases:
  - CHAT-API-N01: credential-extraction prompt is blocked
  - CHAT-API-N02: prompt-injection phrase is blocked
  - CHAT-API-N03: unsupported GET endpoint is not exposed
- Edge 3 cases:
  - CHAT-API-E01: empty or missing message still gets controlled reply
  - CHAT-API-E02: concurrent requests stay stable and return replies
  - CHAT-API-E03: response latency stays under operational budget

### tests/api/orders.api.spec.ts (6 cases)

- Overview: Orders API checks for payment-intent creation and checkout preconditions.
- Summary: Covers mock-vs-stripe intent behavior, empty-cart protections, auth redirects, and concurrent intent request stability.
- Flow: Prepare cart/auth context -> call payment-intent/mock-pay APIs -> validate empty-cart/auth/concurrency behavior.
- Business logic: Checkout intents require authenticated cart state and resilient behavior under concurrent requests.

- Positive 2 cases:
  - ORD-API-P01: create payment intent responds
  - ORD-API-P02: mock pay returns order ID when enabled
- Negative 3 cases:
  - ORD-API-N01: empty cart checkout fails
  - ORD-API-N02: invalid payload items do not bypass empty-cart validation
  - ORD-API-N03: unauthenticated checkout is redirected to login
- Edge 1 cases:
  - ORD-API-E01: concurrent payment-intent requests stay stable and keep cart intact

### tests/e2e/auth.e2e.spec.ts (15 cases)

- Overview: End-to-end authentication journeys for login, registration, password reset, and session transitions.
- Summary: Validates full user flows including reset token handling, inbox-assisted recovery, and guest-to-user cart continuity.
- Flow: Run full auth journeys (login/register/reset) through UI + supporting API state -> validate redirects, inbox/reset token behavior, and cart merge.
- Business logic: Identity lifecycle (register/login/reset/logout) must remain secure and user-state consistent.

- Positive 5 cases:
  - AUTH-P01: login with valid credentials succeeds
  - AUTH-P02: logout clears session successfully
  - AUTH-P03: register new user with unique credentials
  - AUTH-P05: request reset with valid email sends link
  - AUTH-P06: reset password with valid token succeeds
- Negative 8 cases:
  - AUTH-N02: login with wrong password fails
  - AUTH-N01: login with invalid username fails
  - AUTH-N04: register with password mismatch fails
  - AUTH-N03: register with duplicate username or email fails
  - AUTH-N06: reset request with non-existent email shows generic message
  - AUTH-N07: reset with expired token fails
  - AUTH-N08: reset with invalid token redirects to login
  - AUTH-N09: password mismatch during reset shows error
- Edge 2 cases:
  - AUTH-E05: token cannot be reused after successful reset (security)
  - AUTH-E04: guest cart merges with DB cart on login

### tests/e2e/cart.e2e.spec.ts (22 cases)

- Overview: End-to-end cart behavior across product selection, quantity changes, coupon use, and checkout entry.
- Summary: Confirms UI-level cart math, shipping threshold effects, stock feedback, and access rules in realistic customer flows.
- Flow: Browse/add/update/remove items in UI -> apply coupon/shipping transitions -> verify totals and guardrails.
- Business logic: Cart totals, coupons, and shipping rules must stay deterministic under normal and error flows.

- Positive 9 cases:
  - CART-P01: add first product to empty cart
  - CART-P02: add second product and verify subtotal calculation
  - CART-P03: increase quantity updates totals and enables free shipping
  - CART-P04: apply valid coupon reduces grand total
  - CART-P05: remove coupon restores original totals
  - CART-P06: remove product from cart updates totals
  - CART-P07: clear cart empties all items
  - CART-P08: cannot decrease quantity below 1
  - COUP-P02: coupon code is case-insensitive
- Negative 10 cases:
  - CART-N01: cannot add quantity exceeding stock limit
  - CART-N02: admin cannot add items to cart via API (security)
  - CART-N02-UI: admin cannot add items to cart via UI
  - CART-N03: add non-existent product returns 404
  - CART-N04: cannot update quantity to 0 (minimum is 1)
  - CART-N05: cannot update cart item beyond available stock
  - CART-N07: update cart when empty returns error
  - COUP-N01: invalid coupon code shows error
  - COUP-N02: expired coupon rejected with error
  - COUP-N04: empty coupon code rejected
- Edge 3 cases:
  - CART-E01: add at exact stock limit succeeds, adding one more fails
  - COUP-E01: coupon code with whitespace is trimmed
  - COUP-E05: coupon cleared when cart is cleared

### tests/e2e/catalog.e2e.spec.ts (27 cases)

- Overview: End-to-end catalog browsing for listing, filters, sorting, and product detail navigation.
- Summary: Checks discoverability and consistency of product cards, category/search interactions, and detail-page transitions.
- Flow: Interact with search/filter/sort/deep links -> open detail pages -> validate result consistency and empty states.
- Business logic: Search/filter/sort logic must produce predictable product visibility and routing.

- Positive 15 cases:
  - CAT-P01: home shows main controls
  - CAT-P02: search updates URL query
  - CAT-P03: sort updates URL query
  - CAT-P04: category selection updates URL
  - CAT-P05: price filter updates URL
  - CAT-P06: seeded products visible
  - CAT-P07: search is case-insensitive
  - CAT-P08: search by partial term
  - CAT-P09: filter by category automation
  - CAT-P10: filter by price max 500
  - CAT-P11: sort by price asc
  - CAT-P12: sort by price desc
  - CAT-P13: sort by name asc
  - CAT-P14: open product detail by clicking card
  - CAT-P15: product card displays correct price
- Negative 8 cases:
  - CAT-N01: search with no results shows empty state
  - CAT-N02: invalid category shows empty state
  - CAT-N03: price range min > max shows empty state
  - CAT-N04: search + category mismatch shows empty state
  - CAT-N05: search with special chars shows empty state
  - CAT-N06: invalid sort query does not break catalog rendering
  - CAT-N07: non-numeric price query falls back gracefully
  - CAT-N08: whitespace-padded search term returns no results
- Edge 4 cases:
  - CAT-E01: exact price boundary (min=max) is inclusive
  - CAT-E02: deep-link with combined filters resolves deterministically
  - CAT-E03: repeated same search remains idempotent
  - CAT-E04: filter+sort combination preserves both constraints

### tests/e2e/chaos.e2e.spec.ts (10 cases)

- Overview: Deterministic chaos-lab E2E checks for toggle controls, bounded degradation, and reset behavior.
- Summary: Focuses on predictable chaos config effects, API latency/error behavior, and reliable cleanup back to normal state.
- Flow: Toggle chaos modes -> measure bounded degradation and recovery -> verify config persistence and reset correctness.
- Business logic: Chaos controls may degrade UX but must preserve recoverability and reset guarantees.

- Positive 4 cases:
  - CHAOS-P01: chaos lab renders all toggle controls
  - CHAOS-P02: enabling layout-shift via UI persists after reload
  - CHAOS-P03: latency chaos slows product API but stays available
  - CHAOS-P04: customer can still browse product page under latency+layout shift
- Negative 3 cases:
  - CHAOS-N01: random 500 chaos causes intermittent failures, not total outage
  - CHAOS-N02: invalid chaos payload is ignored safely
  - CHAOS-N03: reset clears all active chaos toggles
- Edge 3 cases:
  - CHAOS-E01: all chaos toggles together still allow recovery path
  - CHAOS-E02: rapid config updates follow last-write-wins behavior
  - CHAOS-E03: chaos control endpoint remains fast while app endpoint is delayed

### tests/e2e/chaos-resilience.e2e.spec.ts (9 cases)

- Overview: Resilience chaos E2E checks for checkout reachability under disruptive runtime toggles.
- Summary: Exercises per-toggle and full-chaos purchase attempts with recovery fallback guarantees and long-running stability expectations.
- Flow: Enable per-mode/full chaos during purchase path -> attempt checkout repeatedly -> enforce recovery fallback expectations.
- Business logic: Critical purchase flow should remain recoverable even when disruption toggles are active.

- Positive 0 cases:
  - none
- Negative 0 cases:
  - none
- Edge 9 cases:
  - CHAOS-E12: purchase flow remains recoverable with all chaos toggles enabled
  - CHAOS-E04: purchase flow reaches checkout under dynamicIds chaos
  - CHAOS-E05: purchase flow reaches checkout under flakyElements chaos
  - CHAOS-E06: purchase flow remains recoverable under layoutShift chaos
  - CHAOS-E07: purchase flow reaches checkout under zombieClicks chaos
  - CHAOS-E08: purchase flow reaches checkout under textScramble chaos
  - CHAOS-E09: purchase flow reaches checkout under latency chaos
  - CHAOS-E10: purchase flow reaches checkout under randomErrors chaos
  - CHAOS-E11: purchase flow reaches checkout under brokenAssets chaos

### tests/e2e/chatbot.e2e.spec.ts (9 cases)

- Overview: End-to-end chatbot widget validation for user interaction and response rendering.
- Summary: Covers open/close UX, send actions, multi-turn history, and graceful fallback behavior under route-level failures.
- Flow: Drive chat widget interactions -> assert user/bot message rendering -> validate failure fallback and multi-turn continuity.
- Business logic: Chat widget must remain usable, resilient to failures, and safe in message handling.

- Positive 3 cases:
  - CHAT-E2E-P01: chat widget opens and closes from home page
  - CHAT-E2E-P02: sending a message renders user and bot messages
  - CHAT-E2E-P03: pressing Enter submits chat message
- Negative 3 cases:
  - CHAT-E2E-N01: whitespace-only input is ignored
  - CHAT-E2E-N02: network abort shows fallback error message
  - CHAT-E2E-N03: malformed server response shows fallback error message
- Edge 3 cases:
  - CHAT-E2E-E01: long user message is rendered and input is cleared
  - CHAT-E2E-E02: multi-turn conversation keeps message history
  - CHAT-E2E-E03: widget remains available after page navigation

### tests/e2e/checkout.e2e.spec.ts (19 cases)

- Overview: End-to-end checkout journey validation from cart handoff through payment-ready state.
- Summary: Ensures checkout routing, totals integrity, form readiness, and blocking behavior for invalid or empty-cart conditions.
- Flow: Move from cart to checkout -> validate shipping/coupon/stock/payment readiness -> assert blocking on invalid conditions.
- Business logic: Checkout enforces cart validity, shipping/coupon math, and payment readiness safeguards.

- Positive 9 cases:
  - CHK-P01: setup cart with 2 items and verify subtotal
  - CHK-P02: checkout page shows stripe ready and total matches cart
  - CHK-P03: complete stripe payment redirects to success and appears in profile
  - CHK-P04: order below THB 1000 adds THB 50 shipping
  - CHK-P05: order at or above THB 1000 has free shipping
  - CHK-P06: apply WELCOME10 on low-value order updates totals
  - CHK-P07: apply ROBOT99 on high-value order keeps free shipping
  - CHK-P08: remove coupon restores totals
  - CHK-P09: coupon input hidden after applying (no re-apply)
- Negative 6 cases:
  - CHK-N01: empty cart checkout is blocked (redirect or guard message)
  - CHK-N02: empty name prevents submit (HTML5 validation)
  - CHK-N03: invalid email prevents submit
  - CHK-N04: empty email prevents submit
  - CHK-N05: expired coupon rejected, totals unchanged
  - CHK-N06: stock validation prevents successful checkout
- Edge 4 cases:
  - CHK-E01: discount crossing shipping threshold recalculates correctly
  - CHK-E02: quantity change crossing threshold updates shipping immediately
  - CHK-E03: subtotal below threshold keeps shipping fee applied
  - CHK-E04: high-value order with coupon remains free shipping when still above threshold

### tests/e2e/mobile.e2e.spec.ts (12 cases)

- Overview: Mobile viewport E2E checks for responsive navigation and core shopping flows.
- Summary: Verifies touch-friendly layout behavior, mobile menu interactions, and critical customer actions on small-screen dimensions.
- Flow: Execute core shopping flows under mobile viewport -> validate menu/touch interactions and mobile-specific guards.
- Business logic: Core commerce behavior must hold on mobile layout and touch-oriented navigation.

- Positive 4 cases:
  - MOBILE-P01: mobile navigation menu accessible
  - MOBILE-P02: add product to cart on mobile viewport
  - MOBILE-P03: view and update cart quantity on mobile viewport
  - MOBILE-P04: checkout page accessible on mobile
- Negative 4 cases:
  - MOBILE-N01: empty-cart checkout is blocked on mobile
  - MOBILE-N02: invalid coupon shows validation error on mobile cart
  - MOBILE-N03: no-result search shows empty state on mobile
  - MOBILE-N04: invalid checkout email blocked by HTML5 validation on mobile
- Edge 4 cases:
  - MOBILE-E01: product cards remain usable on small screens
  - MOBILE-E02: landscape rotation keeps checkout flow accessible
  - MOBILE-E03: repeated quantity updates remain consistent on mobile cart
  - MOBILE-E04: coupon apply/remove lifecycle works on mobile cart

### tests/e2e/order-history.e2e.spec.ts (8 cases)

- Overview: End-to-end order history behavior via profile orders tab and invoice access.
- Summary: Validates order visibility, card metadata correctness, authorization boundaries, and refresh/order-sorting consistency.
- Flow: Create orders -> open profile orders tab -> verify card data, invoice navigation, auth gating, and ordering/refresh behavior.
- Business logic: Users should only see valid own-order history with correct metadata and invoice access.

- Positive 4 cases:
  - ORD-HIST-P01: orders tab loads and shows list or empty state
  - ORD-HIST-P02: newly created order shows correct product details
  - ORD-HIST-P03: order card shows status, placed date, and total
  - ORD-HIST-P04: view invoice link navigates to order invoice page
- Negative 2 cases:
  - ORD-HIST-N01: unauthenticated user cannot access order history tab
  - ORD-HIST-N02: empty order history shows empty state for a new user
- Edge 2 cases:
  - ORD-HIST-E01: multiple newly created orders are sorted newest first
  - ORD-HIST-E02: refreshing orders tab preserves order visibility

### tests/e2e/search.e2e.spec.ts (8 cases)

- Overview: End-to-end search experience checks for query behavior and result rendering.
- Summary: Covers exact/partial matching, empty and long query handling, and resilience against unsafe or malformed input text.
- Flow: Run exact/partial/empty/special-character queries -> validate result cards, empty state, and query robustness.
- Business logic: Search handling must remain safe and consistent for normal and adversarial input.

- Positive 3 cases:
  - SEARCH-P01: valid search returns matching product card
  - SEARCH-P02: search is case-insensitive
  - SEARCH-P03: partial name match returns expected product
- Negative 2 cases:
  - SEARCH-N01: no-result search shows empty state
  - SEARCH-N02: empty search returns default unfiltered list
- Edge 3 cases:
  - SEARCH-E01: special characters are handled safely
  - SEARCH-E02: multiple-space term handled as literal input
  - SEARCH-E03: very long search term handled gracefully

### tests/e2e/stripe.e2e.spec.ts (7 cases)

- Overview: Stripe checkout E2E verification for provider-specific payment UI readiness.
- Summary: Checks cart-to-checkout amount parity, Stripe element presence when applicable, and safe fallback behavior in mock mode.
- Flow: Enter checkout from cart -> compare totals -> assert Stripe-vs-mock provider UI behavior and fallback handling.
- Business logic: Provider-specific checkout UI must align with active payment mode and cart totals.

- Positive 3 cases:
  - STRIPE-P01: checkout is reachable and payment section is initialized
  - STRIPE-P02: checkout total matches cart grand total
  - STRIPE-P03: Stripe SDK and payment frame load in stripe mode
- Negative 2 cases:
  - STRIPE-N01: mock mode shows mock-payment note instead of Stripe
  - STRIPE-N02: empty cart blocks real payment entry on checkout
- Edge 2 cases:
  - STRIPE-E01: checkout total remains stable after page reload
  - STRIPE-E02: submit button status exists in both stripe and mock modes

### tests/integration/checkout-mock.int.spec.ts (10 cases)

- Overview: Integration tests for cart-to-checkout consistency in mock payment mode.
- Summary: Validates totals, shipping, coupon propagation, session continuity, and empty-cart guarding across page/API boundaries.
- Flow: Bridge cart API state to checkout UI -> validate totals/shipping/coupon/session coherence across boundaries.
- Business logic: Cart-to-checkout integration must preserve totals, discounts, and session continuity.

- Positive 2 cases:
  - CHK-INT-P01: checkout total matches cart grand total
  - CHK-INT-P02: checkout initializes payment UI for active provider
- Negative 3 cases:
  - CHK-INT-N01: checkout blocks empty cart access
  - CHK-INT-N02: cart cleared during checkout is blocked on refresh
  - CHK-INT-N03: expired coupon does not change checkout total
- Edge 5 cases:
  - CHK-INT-E01: below-threshold order keeps shipping fee in checkout
  - CHK-INT-E02: high-value order keeps free shipping in checkout
  - CHK-INT-E03: valid coupon discount persists from cart to checkout
  - CHK-INT-E04: cart quantity updates propagate to checkout total
  - CHK-INT-E05: session expiry redirects away from checkout

### tests/integration/forgot-reset.int.spec.ts (12 cases)

- Overview: Integration tests for forgot/reset password flow spanning UI, email inbox, and data persistence.
- Summary: Confirms token issuance/rotation/expiry rules, reset link integrity, and secure handling of invalid or reused token paths.
- Flow: Execute forgot/reset across UI + inbox + DB token checks -> verify token lifecycle and secure invalid-path handling.
- Business logic: Reset-token lifecycle must be secure (format, expiry, rotation, one-time use).

- Positive 3 cases:
  - RESET-INT-P01: forgot password sends reset link to demo inbox
  - RESET-INT-P02: reset email has expected subject pattern
  - RESET-INT-P03: reset link uses valid URL and token format
- Negative 4 cases:
  - RESET-INT-N01: non-existent email shows generic success message
  - RESET-INT-N02: invalid email format blocked by HTML5 validation
  - RESET-INT-N03: expired reset token is rejected
  - RESET-INT-N04: used reset token cannot be reused
- Edge 5 cases:
  - RESET-INT-E01: repeated reset requests rotate token for same user
  - RESET-INT-E02: reset link contains hex token in route param
  - RESET-INT-E03: reset link is usable from fresh browser context
  - RESET-INT-E04: reset email body includes reset instructions
  - RESET-INT-E05: query-param token route is not accepted

### tests/integration/notifications.int.spec.ts (11 cases)

- Overview: Integration checks between notifications API responses and dropdown UI state.
- Summary: Ensures unread counts, list payload structure, mark-all-read behavior, and unauthorized access handling stay synchronized.
- Flow: Compare notifications API payloads with dropdown UI -> validate unread count sync, actions, and unauthorized behavior.
- Business logic: Notification counts and payload contracts must stay in sync between API and UI.

- Positive 3 cases:
  - NOTIF-INT-P01: dropdown count aligns with notifications list API
  - NOTIF-INT-P02: notifications API returns expected response structure
  - NOTIF-INT-P03: each notification object has required fields
- Negative 2 cases:
  - NOTIF-INT-N01: invalid notification read endpoint returns not found
  - NOTIF-INT-N02: unauthorized notifications API access is blocked
- Edge 6 cases:
  - NOTIF-INT-E01: mark-all-read action updates unread count from API
  - NOTIF-INT-E02: UI handles bounded notification list size
  - NOTIF-INT-E03: rendered dropdown item count matches API list length
  - NOTIF-INT-E04: notifications count stays consistent across tabs
  - NOTIF-INT-E05: notification timestamps are valid and not stale
  - NOTIF-INT-E06: pagination query keeps response contract stable

### tests/integration/order-inventory.int.spec.ts (7 cases)

- Overview: Integration tests for order placement impact on inventory consistency and concurrency.
- Summary: Verifies stock deduction correctness, oversell prevention, stale-cart revalidation, and controlled errors on depleted stock.
- Flow: Create orders against controlled stock -> verify deduction math, oversell prevention, and stale-cart revalidation.
- Business logic: Order success must atomically deduct stock without overselling under concurrency.

- Positive 3 cases:
  - ORD-INV-INT-P01: stock decreases after successful order
  - ORD-INV-INT-P02: stock reduction equals ordered quantity
  - ORD-INV-INT-P03: order is created when quantity is within stock
- Negative 2 cases:
  - ORD-INV-INT-N01: cart rejects quantity above available stock
  - ORD-INV-INT-N02: zero stock blocks adding and checkout
- Edge 2 cases:
  - ORD-INV-INT-E01: concurrent orders cannot oversell inventory
  - ORD-INV-INT-E02: checkout revalidates stale cart against current stock

### tests/integration/product-cart.int.spec.ts (7 cases)

- Overview: Integration tests for product-detail data fidelity after cart insertion.
- Summary: Checks price/name/image consistency, quantity carryover, repeated-add accumulation, and stock-validation error behavior.
- Flow: Move product detail data into cart rows -> verify name/price/image/quantity consistency and stock rejection behavior.
- Business logic: Product attributes must transfer correctly into cart state with enforced stock guards.

- Positive 3 cases:
  - PROD-CART-INT-P01: product price matches cart unit price
  - PROD-CART-INT-P02: product name transfers correctly to cart row
  - PROD-CART-INT-P03: selected quantity is preserved when added to cart
- Negative 2 cases:
  - PROD-CART-INT-N01: out-of-stock product cannot be added via API
  - PROD-CART-INT-N02: quantity above current stock is rejected
- Edge 2 cases:
  - PROD-CART-INT-E01: product image mapping remains consistent in cart
  - PROD-CART-INT-E02: repeated add operations accumulate quantity and total

### tests/security/authorization.spec.ts (12 cases)

- Overview: Security authorization tests for role-based access control and ownership boundaries.
- Summary: Validates anon/user/admin route protections, admin business restrictions, logout invalidation, and invoice ownership isolation.
- Flow: Probe routes/endpoints with anon/user/admin contexts -> validate RBAC, ownership checks, and session invalidation.
- Business logic: Least-privilege access and ownership boundaries must hold across role transitions.

- Positive 2 cases:
  - AUTHZ-P01: admin can access admin dashboard and admin notifications API
  - AUTHZ-P02: authenticated user can access own protected resources
- Negative 7 cases:
  - AUTHZ-N01: anonymous is redirected from notifications API
  - AUTHZ-N02: regular user is forbidden from admin notifications API
  - AUTHZ-N03: admin dashboard rejects anonymous and regular users
  - AUTHZ-N04: admin is blocked from cart add API
  - AUTHZ-N05: reset-stock endpoint rejects requests without reset key
  - AUTHZ-N06: logout invalidates protected API access
  - AUTHZ-N07: anonymous cannot access profile orders page
- Edge 3 cases:
  - AUTHZ-E01: invoice access is restricted to order owner
  - AUTHZ-E02: invalid invoice id returns 404 without stack trace leak
  - AUTHZ-E03: role switch in same API context updates authorization

### tests/security/chat.security.spec.ts (8 cases)

- Overview: Security-focused chat tests for prompt abuse resistance and hardened endpoint behavior.
- Summary: Covers blocked sensitive prompts, malformed request handling, leak-prevention assertions, and consistency across auth states.
- Flow: Send abuse/malformed chat inputs -> assert refusals, non-leakage, and stable behavior across auth states.
- Business logic: Prompt abuse must be blocked without leaking sensitive internals.

- Positive 2 cases:
  - CHAT-SEC-P01: password/credential extraction prompt is blocked
  - CHAT-SEC-P02: credit-card data extraction prompt is blocked
- Negative 3 cases:
  - CHAT-SEC-N01: SQL-like prompt does not produce server error
  - CHAT-SEC-N02: malformed JSON payload is rejected without 5xx
  - CHAT-SEC-N03: GET method tampering is not exposed
- Edge 3 cases:
  - CHAT-SEC-E01: burst of dangerous prompts stays blocked
  - CHAT-SEC-E02: blocked output does not leak sensitive keywords
  - CHAT-SEC-E03: blocked behavior is consistent for anon and logged-in user

### tests/security/headers.security.spec.ts (12 cases)

- Overview: Security header verification for key pages and APIs with environment-aware strictness.
- Summary: Checks baseline hardening headers, safe header values, CORS/CSP/HSTS expectations, and non-leaky error responses.
- Flow: Request key pages/APIs -> inspect security headers and error responses -> enforce environment-aware hardening rules.
- Business logic: Response headers must enforce baseline web hardening and avoid unsafe configurations.

- Positive 6 cases:
  - SEC-HDR-P01: key routes return non-5xx responses
  - SEC-HDR-P02: key APIs return non-5xx responses
  - SEC-HDR-P03: production target includes baseline security headers
  - SEC-HDR-P04: CORS credentials are not paired with wildcard origin
  - SEC-HDR-P05: CSP directives avoid obviously dangerous patterns
  - SEC-HDR-P06: HSTS contains max-age when present
- Negative 3 cases:
  - SEC-HDR-N01: x-content-type-options is strict when present
  - SEC-HDR-N02: x-frame-options blocks framing when present
  - SEC-HDR-N03: referrer-policy avoids unsafe-url when present
- Edge 3 cases:
  - SEC-HDR-E01: not-found responses do not leak stack traces
  - SEC-HDR-E02: header values are non-empty when provided
  - SEC-HDR-E03: permissions-policy is restrictive when present

### tests/security/input-hardening.security.spec.ts (5 cases)

- Overview: Input hardening security tests for injection-like payloads and malformed identifiers.
- Summary: Ensures authentication and protected endpoints resist tampering while returning controlled 4xx responses without stack leakage.
- Flow: Submit injection/tampering payloads -> verify controlled rejections and absence of stack/privilege leakage.
- Business logic: Input tampering should fail safely with controlled 4xx outputs and no internal disclosure.

- Positive 1 cases:
  - SEC-INP-P01: valid login still works after failed malicious attempts
- Negative 3 cases:
  - SEC-INP-N01: SQL/XSS-like login payloads are rejected
  - SEC-INP-N02: admin endpoint query tampering does not bypass role checks
  - SEC-INP-N03: anonymous query tampering does not bypass protected API auth
- Edge 1 cases:
  - SEC-INP-E01: malformed invoice ids return controlled 4xx without stack leaks

