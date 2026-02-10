import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { app, perfAuth } from '../lib/config.js';
import { headers } from '../lib/http.js';
import { concurrent } from '../scenarios/index.js';
import { raceThresholds } from '../thresholds/index.js';
import {
  toPositiveInt,
  parseProductsPayload,
  getLocation,
  isAuthRedirect,
  isStockLimitResponse,
  resetStockIfNeeded
} from '../lib/perf-helpers.js';

/**
 * =============================================================================
 * RACE CONDITION TEST - Overselling Protection During Concurrent Checkout
 * =============================================================================
 *
 * Scenario:
 * - 20 VUs / 20 shared iterations (from `concurrent` scenario)
 * - All VUs try to checkout the same product at nearly the same time
 *
 * Expected outcome:
 * - Some checkouts succeed (HTTP 200)
 * - Remaining requests are rejected (HTTP 400 or cart guard redirect)
 * - No 5xx errors and no overselling behavior
 *
 * Notes:
 * - Use PERF_RESET_STOCK=true to reset inventory before running.
 * - Checkout uses mock payment endpoint to avoid real payment integration.
 * =============================================================================
 */

const TEST_USER = {
  username: perfAuth.username,
  password: perfAuth.password
};

const TARGET_PRODUCT = {
  id: Number(__ENV.PERF_RACE_PRODUCT_ID || 0),
  quantity: toPositiveInt(__ENV.PERF_RACE_QUANTITY, 1)
};

const RESET_STOCK = String(__ENV.PERF_RESET_STOCK || 'false').toLowerCase() === 'true';
const RESET_KEY = __ENV.RESET_KEY || __ENV.PERF_RESET_KEY || '';

const successfulPurchases = new Counter('successful_purchases');
const rejectedPurchases = new Counter('rejected_purchases');
const unexpectedPurchases = new Counter('unexpected_purchases');
const checkoutDuration = new Trend('checkout_duration');

export const options = {
  scenarios: {
    race_checkout: concurrent
  },
  thresholds: raceThresholds
};

function pickTargetProduct(products) {
  const inStockProducts = [];

  for (let i = 0; i < products.length; i += 1) {
    const item = products[i] || {};
    const id = Number(item.id);
    const stock = Number(item.stock);
    if (Number.isInteger(id) && Number.isFinite(stock) && stock > 0) {
      inStockProducts.push({ id, stock });
    }
  }

  if (inStockProducts.length === 0) {
    return null;
  }

  if (Number.isInteger(TARGET_PRODUCT.id) && TARGET_PRODUCT.id > 0) {
    const preferred = inStockProducts.find((item) => item.id === TARGET_PRODUCT.id);
    if (preferred) {
      return preferred;
    }

    console.warn(
      `[Setup] PERF_RACE_PRODUCT_ID=${TARGET_PRODUCT.id} is not in stock. Falling back to another in-stock product.`
    );
  }

  // Choose the lowest-stock in-stock product to increase contention probability.
  inStockProducts.sort((a, b) => a.stock - b.stock || a.id - b.id);
  return inStockProducts[0];
}

function withSingleRetry(requestFn) {
  let res = requestFn();
  if (res && res.status >= 500) {
    sleep(0.05);
    res = requestFn();
  }
  return res;
}

function authenticate() {
  const loginRes = http.post(
    `${app.baseURL}/login`,
    {
      username: TEST_USER.username,
      password: TEST_USER.password
    },
    {
      headers: headers.form,
      redirects: 0,
      tags: { endpoint: 'auth_login' }
    }
  );

  const location = getLocation(loginRes);
  const loginOk = check(loginRes, {
    'race login status is 200/302/303': (r) =>
      r.status === 200 || r.status === 302 || r.status === 303,
    'race login not redirected back to /login': () =>
      loginRes.status === 200 || !location.includes('/login')
  });

  if (!loginOk) {
    return false;
  }

  const profileRes = http.get(`${app.baseURL}/profile`, {
    redirects: 0,
    tags: { endpoint: 'auth_profile' }
  });

  return check(profileRes, {
    'race profile is accessible': (r) => r.status === 200
  });
}

export function setup() {
  console.log(`[Setup] Race test target: ${app.baseURL}`);

  resetStockIfNeeded({ enabled: RESET_STOCK, resetKey: RESET_KEY });

  const productsRes = http.get(`${app.baseURL}/api/products`, {
    redirects: 0,
    tags: { endpoint: 'products_list' }
  });
  const products = parseProductsPayload(productsRes);
  const target = pickTargetProduct(products);

  if (!target) {
    throw new Error(
      'No in-stock product found for race test. ' +
        'Set PERF_RESET_STOCK=true with RESET_KEY or replenish inventory before running race test.'
    );
  }

  const effectiveQuantity = Math.min(TARGET_PRODUCT.quantity, Math.max(1, target.stock));
  if (effectiveQuantity !== TARGET_PRODUCT.quantity) {
    console.warn(
      `[Setup] Requested quantity=${TARGET_PRODUCT.quantity} exceeds stock=${target.stock}. Using quantity=${effectiveQuantity}.`
    );
  }

  console.log(
    `[Setup] Target product: id=${target.id}, stock=${target.stock}, quantity=${effectiveQuantity}`
  );

  return {
    targetProductId: target.id,
    targetQuantity: effectiveQuantity
  };
}

export default function (data) {
  const targetProductId =
    data && Number.isInteger(Number(data.targetProductId))
      ? Number(data.targetProductId)
      : TARGET_PRODUCT.id;
  const targetQuantity =
    data && Number.isInteger(Number(data.targetQuantity))
      ? Number(data.targetQuantity)
      : TARGET_PRODUCT.quantity;

  const isLoggedIn = group('Authenticate', () => authenticate());
  if (!isLoggedIn) {
    unexpectedPurchases.add(1);
    return;
  }

  group('Add to Cart', () => {
    const res = withSingleRetry(() =>
      http.post(
        `${app.baseURL}/api/cart/add`,
        JSON.stringify({
          productId: targetProductId,
          quantity: targetQuantity
        }),
        {
          headers: headers.json,
          redirects: 0,
          tags: { endpoint: 'cart_add' },
          responseCallback: http.expectedStatuses(200, 302, 303, 400)
        }
      )
    );

    const handled = check(res, {
      'race cart add handled': (r) => r.status === 200 || isStockLimitResponse(r),
      'race cart add no 5xx': (r) => r.status < 500
    });

    if (!handled || isAuthRedirect(res)) {
      unexpectedPurchases.add(1);
    }
  });

  // Small sync window so many VUs hit checkout close together.
  sleep(0.1);

  group('Concurrent Checkout', () => {
    const startedAt = Date.now();
    const checkoutRes = withSingleRetry(() =>
      http.post(`${app.baseURL}/order/api/mock-pay`, JSON.stringify({}), {
        headers: headers.json,
        redirects: 0,
        tags: { endpoint: 'checkout_mock_pay' },
        responseCallback: http.expectedStatuses(200, 302, 303, 400)
      })
    );
    checkoutDuration.add(Date.now() - startedAt);

    const handled = check(checkoutRes, {
      'race checkout handled': (r) => r.status === 200 || isStockLimitResponse(r),
      'race checkout no 5xx': (r) => r.status < 500
    });

    if (!handled) {
      unexpectedPurchases.add(1);
      return;
    }

    if (checkoutRes.status === 200) {
      let hasOrderId = false;
      try {
        const body = checkoutRes.json();
        hasOrderId = Boolean(body && body.orderId);
      } catch (_error) {
        hasOrderId = false;
      }

      if (hasOrderId) {
        successfulPurchases.add(1);
      } else {
        unexpectedPurchases.add(1);
      }
      return;
    }

    rejectedPurchases.add(1);
  });
}

export function teardown() {
  console.log('\n========================================');
  console.log('RACE CONDITION TEST ANALYSIS');
  console.log('========================================');
  console.log('Review successful_purchases vs rejected_purchases.');
  console.log('Expected: controlled rejections when stock is exhausted, with no 5xx.');
  console.log('========================================\n');
}
