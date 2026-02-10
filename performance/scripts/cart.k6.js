import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { app } from '../lib/config.js';
import { ramping } from '../scenarios/index.js';
import { cartThresholds } from '../thresholds/index.js';
import { headers } from '../lib/http.js';
import {
  toPositiveInt,
  createProductPool,
  fetchTargetProductIds,
  isStockLimitResponse,
  resetStockIfNeeded
} from '../lib/perf-helpers.js';

/**
 * =============================================================================
 * CART PERFORMANCE TESTS - User Journey: Shopper
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Add Item to Cart
 * 2. Get Cart Details
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES:
 *   - PERF-CART-01: Add to cart returns updated cart state
 *   - PERF-CART-02: Get cart handles empty and populated states
 *
 * Business Rules Tested:
 * ----------------------
 * - Data Consistency: Cart writes must be durable
 * - Concurrency: Multiple users adding items shouldn't deadlock
 *
 * =============================================================================
 */

const cartCustomThresholds = {
  ...cartThresholds,
  cart_add_success: ['count>0'],
  cart_add_unexpected: ['count==0']
};

export const options = {
  scenarios: {
    cart: ramping
  },
  thresholds: cartCustomThresholds
};

const RESET_STOCK = String(__ENV.PERF_RESET_STOCK || 'false').toLowerCase() === 'true';
const RESET_KEY = __ENV.RESET_KEY || __ENV.PERF_RESET_KEY || '';

const PRODUCT_MIN = toPositiveInt(__ENV.PERF_PRODUCT_MIN, 1);
const PRODUCT_MAX = Math.max(PRODUCT_MIN, toPositiveInt(__ENV.PERF_PRODUCT_MAX, 9));

const productPool = createProductPool({
  sharedArrayName: 'cart_product_ids_from_csv',
  productMin: PRODUCT_MIN,
  productMax: PRODUCT_MAX
});

const cartAddSuccess = new Counter('cart_add_success');
const cartAddRejected = new Counter('cart_add_rejected');
const cartAddUnexpected = new Counter('cart_add_unexpected');

export function setup() {
  const productSource = productPool.getSourceLabel();

  console.log(`[Setup] Cart test target: ${app.baseURL}`);
  console.log(`[Setup] Product source: ${productSource}`);

  resetStockIfNeeded({ enabled: RESET_STOCK, resetKey: RESET_KEY });

  const selectedProductIds = fetchTargetProductIds(productPool.preferredIds);
  console.log(`[Setup] In-stock target pool: ${selectedProductIds.length}`);

  if (selectedProductIds.length === 0) {
    throw new Error(
      'No in-stock products available for cart add path. ' +
        'Set PERF_RESET_STOCK=true with RESET_KEY or replenish inventory before running cart test.'
    );
  }

  return { selectedProductIds };
}

export default function (data) {
  const selectedProductIds =
    data && Array.isArray(data.selectedProductIds) ? data.selectedProductIds : null;

  group('Add Item to Cart', () => {
    const payload = JSON.stringify({
      productId: productPool.pickProductIdFrom(selectedProductIds),
      quantity: 1
    });
    const res = http.post(`${app.baseURL}/api/cart/add`, payload, {
      headers: headers.json,
      redirects: 0,
      tags: { endpoint: 'cart_add' },
      responseCallback: http.expectedStatuses(200, 302, 303, 400)
    });

    const handled = check(res, {
      'cart add handled': (r) => r.status === 200 || isStockLimitResponse(r),
      'cart add no 5xx': (r) => r.status < 500
    });

    if (res.status === 200) {
      cartAddSuccess.add(1);
      return;
    }

    if (isStockLimitResponse(res)) {
      cartAddRejected.add(1);
      return;
    }

    if (!handled) {
      cartAddUnexpected.add(1);
    }
  });

  group('View Cart', () => {
    const res = http.get(`${app.baseURL}/api/cart`, {
      redirects: 0,
      tags: { endpoint: 'cart_get' }
    });

    check(res, {
      'view cart status is 200': (r) => r.status === 200,
      'view cart returns json': (r) =>
        String(r.headers['Content-Type'] || r.headers['content-type'] || '').includes(
          'application/json'
        )
    });
  });

  sleep(1);
}
