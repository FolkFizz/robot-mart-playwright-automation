import http from 'k6/http';
import { group, sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { app, perfAuth } from '../lib/config.js';
import { spike } from '../scenarios/index.js';
import { headers } from '../lib/http.js';
import { checkoutThresholds, checkoutAcceptanceThresholds } from '../thresholds/index.js';
import {
  toPositiveInt,
  createProductPool,
  parseProductsPayload,
  getInStockPreferredIds,
  getInStockAnyIds,
  isAuthFailureResponse,
  isStockLimitResponse,
  resetStockIfNeeded
} from '../lib/perf-helpers.js';

/**
 * =============================================================================
 * CHECKOUT PERFORMANCE TESTS - Buyer Critical Path Under Spike
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Authenticate as customer (form login)
 * 2. Add item to cart
 * 3. Complete mock checkout (POST /order/api/mock-pay)
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES:
 *   - PERF-CHECKOUT-01: Checkout succeeds (200) with order creation
 *
 * CONTROLLED BUSINESS REJECTION:
 *   - PERF-CHECKOUT-02: Checkout may return 400 when stock is depleted
 *
 * Business Rules Tested:
 * ----------------------
 * - Auth Gate: Checkout requires authenticated session
 * - Transaction Integrity: Successful payment returns orderId
 * - Inventory Protection: Stock depletion returns controlled 400 responses
 *
 * Note:
 * - Modes:
 *   - CHECKOUT_MODE=strict (default): enforce checkout quality gates.
 *   - CHECKOUT_MODE=acceptance: measurement mode for unstable/shared environments.
 * - Uses mock payment intentionally to avoid calling real Stripe API.
 * - 400 responses are treated as expected business outcomes (not transport errors).
 * - If configured product IDs have no stock, setup falls back to any in-stock API product.
 * - checkout_attempts must be > 0 to avoid false-pass runs with empty cart path.
 *
 * =============================================================================
 */

// Metrics for outcome-level analysis
const cartSuccess = new Counter('cart_success');
const checkoutSuccess = new Counter('checkout_success');
const cartRejected = new Counter('cart_rejected');
const checkoutRejected = new Counter('checkout_rejected');
const checkoutUnexpected = new Counter('checkout_unexpected');
const checkoutServerError = new Counter('checkout_server_error');
const checkoutAttempts = new Counter('checkout_attempts');
const checkoutDuration = new Trend('checkout_duration');

const TEST_USER = {
  username: perfAuth.username,
  password: perfAuth.password
};

const CHECKOUT_MODE =
  String(__ENV.CHECKOUT_MODE || 'strict').toLowerCase() === 'acceptance' ? 'acceptance' : 'strict';

const RESET_STOCK = String(__ENV.PERF_RESET_STOCK || 'false').toLowerCase() === 'true';
const RESET_KEY = __ENV.RESET_KEY || __ENV.PERF_RESET_KEY || '';
const AUTO_REGISTER = String(__ENV.PERF_AUTO_REGISTER || 'false').toLowerCase() === 'true';
const AUTO_REGISTER_PASSWORD = perfAuth.autoRegisterPassword;
const DEBUG_UNEXPECTED = String(__ENV.PERF_DEBUG_UNEXPECTED || 'false').toLowerCase() === 'true';
const MAX_UNEXPECTED_LOGS = Number(__ENV.PERF_DEBUG_MAX_LOGS || 10);

const PRODUCT_MIN = toPositiveInt(__ENV.PERF_PRODUCT_MIN, 1);
const PRODUCT_MAX = Math.max(PRODUCT_MIN, toPositiveInt(__ENV.PERF_PRODUCT_MAX, 9));

const productPool = createProductPool({
  sharedArrayName: 'checkout_product_ids_from_csv',
  productMin: PRODUCT_MIN,
  productMax: PRODUCT_MAX
});

let isAuthenticated = false;
let vuUserInitialized = false;
let unexpectedLogCount = 0;
let vuCredentials = {
  username: TEST_USER.username,
  password: TEST_USER.password
};

export const options = {
  scenarios: {
    // Checkout is often spike-loaded during promotions or flash sales.
    flash_sale: spike
  },
  thresholds: CHECKOUT_MODE === 'strict' ? checkoutThresholds : checkoutAcceptanceThresholds,
  tags: { checkout_mode: CHECKOUT_MODE }
};

function getInStockSourceIds(products) {
  return getInStockPreferredIds(products, productPool.preferredIds);
}

function fetchProducts() {
  const productsRes = http.get(`${app.baseURL}/api/products`, {
    redirects: 0,
    tags: { endpoint: 'products_list' }
  });

  return parseProductsPayload(productsRes);
}

function assertCheckoutPreconditions() {
  const products = fetchProducts();
  const sourceInStockIds = getInStockSourceIds(products);
  console.log(`[Setup] In-stock configured product count: ${sourceInStockIds.length}`);

  if (sourceInStockIds.length > 0) {
    return sourceInStockIds;
  }

  const anyInStockIds = getInStockAnyIds(products);
  if (anyInStockIds.length > 0) {
    console.warn(
      `[Setup] Configured source has no stock. Fallback to API in-stock pool (${anyInStockIds.length} ids).`
    );
    return anyInStockIds;
  }

  throw new Error(
    'No in-stock products available in API. ' +
      'Set PERF_RESET_STOCK=true with RESET_KEY or replenish inventory before running checkout test.'
  );
}

export function setup() {
  const productSource = productPool.getSourceLabel();

  console.log(`[Setup] Checkout mode: ${CHECKOUT_MODE.toUpperCase()}`);
  console.log(`[Setup] Checkout test target: ${app.baseURL}`);
  console.log(`[Setup] Product source: ${productSource}`);

  resetStockIfNeeded({ enabled: RESET_STOCK, resetKey: RESET_KEY });

  const availableProductIds = assertCheckoutPreconditions();
  return { availableProductIds };
}

function withReauthRetry(requestFn) {
  let res = requestFn();
  if (isAuthFailureResponse(res)) {
    isAuthenticated = false;
    if (authenticate()) {
      res = requestFn();
    }
  }
  return res;
}

function authenticate() {
  if (!ensureVuCredentials()) {
    isAuthenticated = false;
    return false;
  }

  const loginRes = http.post(
    `${app.baseURL}/login`,
    {
      username: vuCredentials.username,
      password: vuCredentials.password
    },
    {
      headers: headers.form,
      redirects: 0,
      tags: { endpoint: 'auth_login' }
    }
  );

  const loginLocation = String(loginRes.headers.Location || loginRes.headers.location || '');
  const ok = check(loginRes, {
    'login status is allowed (200/302/303)': (r) =>
      r.status === 200 || r.status === 302 || r.status === 303,
    'login does not redirect back to /login': () =>
      loginRes.status === 200 || !loginLocation.includes('/login')
  });

  if (!ok) {
    isAuthenticated = false;
    return false;
  }

  const profileRes = http.get(`${app.baseURL}/profile`, {
    redirects: 0,
    tags: { endpoint: 'auth_profile' }
  });
  const profileOk = check(profileRes, {
    'profile is accessible after login': (r) => r.status === 200
  });

  isAuthenticated = profileOk;
  return profileOk;
}

function ensureVuCredentials() {
  if (vuUserInitialized) {
    return true;
  }

  // Default mode: shared static user from env.
  if (!AUTO_REGISTER) {
    vuUserInitialized = true;
    return true;
  }

  const unique = `k6_perf_${__VU}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const registerRes = http.post(
    `${app.baseURL}/register`,
    {
      username: unique,
      email: `${unique}@${perfAuth.emailDomain}`,
      password: AUTO_REGISTER_PASSWORD,
      confirmPassword: AUTO_REGISTER_PASSWORD
    },
    {
      headers: headers.form,
      redirects: 0,
      tags: { endpoint: 'auth_register' }
    }
  );

  const registerLocation = String(
    registerRes.headers.Location || registerRes.headers.location || ''
  );
  const registerOk = check(registerRes, {
    'register status is allowed (200/302/303)': (r) =>
      r.status === 200 || r.status === 302 || r.status === 303,
    'register does not loop back to /register': () =>
      registerRes.status === 200 || !registerLocation.includes('/register')
  });

  if (!registerOk) {
    return false;
  }

  vuCredentials = {
    username: unique,
    password: AUTO_REGISTER_PASSWORD
  };
  vuUserInitialized = true;
  return true;
}

function logUnexpected(status, bodySnippet) {
  if (!DEBUG_UNEXPECTED || unexpectedLogCount >= MAX_UNEXPECTED_LOGS) {
    return;
  }

  unexpectedLogCount += 1;
  console.warn(
    `[checkout][unexpected] status=${status} response=${String(bodySnippet || '').slice(0, 200)}`
  );
}

export default function (data) {
  if (!isAuthenticated) {
    const loggedIn = group('Authenticate', () => authenticate());
    if (!loggedIn) {
      checkoutUnexpected.add(1);
      sleep(1);
      return;
    }
  }

  const setupProductIds =
    data && Array.isArray(data.availableProductIds) ? data.availableProductIds : null;
  const productId = productPool.pickProductIdFrom(setupProductIds);

  const cartReady = group('Setup: Add to Cart', () => {
    const addRes = withReauthRetry(() =>
      http.post(`${app.baseURL}/api/cart/add`, JSON.stringify({ productId, quantity: 1 }), {
        headers: headers.json,
        redirects: 0,
        tags: { endpoint: 'cart_add' },
        responseCallback: http.expectedStatuses(200, 302, 303, 400)
      })
    );

    const handled = check(addRes, {
      'cart add handled': (r) => r.status === 200 || isStockLimitResponse(r),
      'cart add no 5xx': (r) => r.status < 500
    });

    if (addRes.status === 200) {
      cartSuccess.add(1);
      return true;
    }

    if (isStockLimitResponse(addRes)) {
      cartRejected.add(1);
      return false;
    }

    if (!handled) {
      logUnexpected(addRes.status, addRes.body);
      checkoutUnexpected.add(1);
    }

    return false;
  });

  if (!cartReady) {
    sleep(1);
    return;
  }

  group('Checkout Action', () => {
    const start = Date.now();
    checkoutAttempts.add(1);
    const res = withReauthRetry(() =>
      http.post(`${app.baseURL}/order/api/mock-pay`, JSON.stringify({}), {
        headers: headers.json,
        redirects: 0,
        tags: { endpoint: 'checkout_mock_pay' },
        // 400 is expected when stock is depleted in high-concurrency spikes.
        responseCallback: http.expectedStatuses(200, 302, 303, 400)
      })
    );
    checkoutDuration.add(Date.now() - start);

    const handled = check(res, {
      'checkout status is 200 or 400': (r) => r.status === 200 || r.status === 400,
      'checkout has no server error': (r) => r.status < 500
    });

    if (!handled) {
      if (res.status >= 500) {
        checkoutServerError.add(1);
      }
      if (isAuthFailureResponse(res)) {
        isAuthenticated = false;
      }
      logUnexpected(res.status, res.body);
      checkoutUnexpected.add(1);
      return;
    }

    if (res.status === 200) {
      try {
        const body = res.json();
        const successPayload = check(res, {
          'successful checkout has orderId': () => Boolean(body && body.orderId),
          'successful checkout has status=success': () => Boolean(body && body.status === 'success')
        });

        if (!successPayload) {
          logUnexpected(res.status, JSON.stringify(body));
          checkoutUnexpected.add(1);
          return;
        }
      } catch (_error) {
        logUnexpected(res.status, res.body);
        checkoutUnexpected.add(1);
        return;
      }

      checkoutSuccess.add(1);
      return;
    }

    try {
      const body = res.json();
      const message = (body && body.message ? String(body.message) : '').toLowerCase();

      if (message.includes('mock payments are disabled')) {
        logUnexpected(res.status, JSON.stringify(body));
        checkoutUnexpected.add(1);
        return;
      }
    } catch (_error) {
      // Ignore JSON parse errors for business rejections.
    }

    checkoutRejected.add(1);
  });

  sleep(0.5);
}
