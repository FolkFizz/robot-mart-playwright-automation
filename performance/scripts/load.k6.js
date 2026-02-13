import http from 'k6/http';
import { group, sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { app, perfAuth } from '../lib/config.js';
import { headers } from '../lib/http.js';
import { loadStrict } from '../scenarios/index.js';
import { loadBalancedThresholds, loadAcceptanceThresholds } from '../thresholds/index.js';
import {
  toPositiveInt,
  createProductPool,
  fetchTargetProductIds,
  isStockLimitResponse,
  resetStockIfNeeded
} from '../lib/perf-helpers.js';

/**
 * Overview: Configurable end-to-end load journey combining login, browse, cart add, and mock checkout actions.
 * Summary: Compares balanced versus acceptance run modes while monitoring full-journey completion and stage-level latency trends.
 */

const TEST_MODE =
  String(__ENV.TEST_MODE || 'balanced').toLowerCase() === 'acceptance' ? 'acceptance' : 'balanced';

const TEST_USER = {
  username: perfAuth.username,
  password: perfAuth.password
};

const RESET_STOCK = String(__ENV.PERF_RESET_STOCK || 'false').toLowerCase() === 'true';
const RESET_KEY = __ENV.RESET_KEY || __ENV.PERF_RESET_KEY || '';

const PRODUCT_MIN = toPositiveInt(__ENV.PERF_PRODUCT_MIN, 1);
const PRODUCT_MAX = Math.max(PRODUCT_MIN, toPositiveInt(__ENV.PERF_PRODUCT_MAX, 205));

const productPool = createProductPool({
  sharedArrayName: 'product_ids_from_csv',
  productMin: PRODUCT_MIN,
  productMax: PRODUCT_MAX
});

const loginAttempts = new Counter('login_attempts');
const browseAttempts = new Counter('browse_attempts');
const cartAttempts = new Counter('cart_attempts');
const cartRejected = new Counter('cart_rejected');
const checkoutAttempts = new Counter('checkout_attempts');
const checkoutRejected = new Counter('checkout_rejected');
const fullJourneySuccess = new Counter('full_journey_success');

const loginDuration = new Trend('login_duration');
const browseDuration = new Trend('browse_duration');
const cartDuration = new Trend('cart_duration');
const checkoutDuration = new Trend('checkout_duration');

export const options = {
  scenarios: {
    load_journey: loadStrict
  },
  thresholds: TEST_MODE === 'balanced' ? loadBalancedThresholds : loadAcceptanceThresholds,
  tags: { test_mode: TEST_MODE }
};

export function setup() {
  const productSource = productPool.getSourceLabel();

  resetStockIfNeeded({ enabled: RESET_STOCK, resetKey: RESET_KEY });

  const selectedProductIds = fetchTargetProductIds(productPool.preferredIds);

  console.log(`\n[Setup] Load Test - mode=${TEST_MODE.toUpperCase()}`);
  console.log(`[Setup] Target: ${app.baseURL}`);
  console.log('[Setup] Profile: 0->20->20->0 VUs (2m)');
  console.log(`[Setup] Product source: ${productSource}`);
  console.log(`[Setup] In-stock target pool: ${selectedProductIds.length}`);

  if (selectedProductIds.length === 0) {
    if (TEST_MODE === 'balanced') {
      throw new Error(
        'No in-stock product IDs discovered for balanced mode. ' +
          'Set TEST_MODE=acceptance for measurement-only run, or replenish/reset stock before rerunning.'
      );
    }

    console.warn(
      '[Setup] No in-stock product IDs discovered. Acceptance mode will measure browse/login only.'
    );
  }

  console.log('');
  return { selectedProductIds };
}

export default function (data) {
  let journeyHealthy = true;
  let checkoutCompleted = false;
  const selectedProductIds =
    data && Array.isArray(data.selectedProductIds) ? data.selectedProductIds : null;

  const loginOk = group('Login', () => {
    const start = Date.now();
    loginAttempts.add(1);

    const res = http.post(
      `${app.baseURL}/login`,
      { username: TEST_USER.username, password: TEST_USER.password },
      {
        headers: headers.form,
        redirects: 0,
        tags: { endpoint: 'login' }
      }
    );

    loginDuration.add(Date.now() - start);

    const redirectLocation = String(res.headers.Location || res.headers.location || '');
    return check(res, {
      'login status is 200/302/303': (r) =>
        r.status === 200 || r.status === 302 || r.status === 303,
      'login not redirected back to /login': () =>
        res.status === 200 || !redirectLocation.includes('/login')
    });
  });

  if (!loginOk) {
    sleep(1);
    return;
  }

  sleep(1 + Math.random());

  const browseOk = group('Browse', () => {
    const start = Date.now();
    browseAttempts.add(1);

    const res = http.get(`${app.baseURL}/`, {
      tags: { endpoint: 'home' }
    });

    browseDuration.add(Date.now() - start);
    return check(res, { 'browse ok': (r) => r.status === 200 });
  });

  if (!browseOk) {
    journeyHealthy = false;
  }

  sleep(2 + Math.random() * 2);

  const cartOk = group('Cart', () => {
    const start = Date.now();
    cartAttempts.add(1);

    const res = http.post(
      `${app.baseURL}/api/cart/add`,
      JSON.stringify({ productId: productPool.pickProductIdFrom(selectedProductIds), quantity: 1 }),
      {
        headers: headers.json,
        redirects: 0,
        tags: { endpoint: 'cart_add' },
        responseCallback: http.expectedStatuses(200, 302, 303, 400)
      }
    );

    cartDuration.add(Date.now() - start);
    const handled = check(res, {
      'cart handled': (r) => r.status === 200 || isStockLimitResponse(r),
      'cart no 5xx': (r) => r.status < 500
    });

    if (res.status === 200) {
      return true;
    }

    if (isStockLimitResponse(res)) {
      cartRejected.add(1);
      return false;
    }

    return handled;
  });

  if (!cartOk) {
    journeyHealthy = false;
    sleep(1);
    return;
  }

  sleep(1 + Math.random());

  group('Checkout', () => {
    const start = Date.now();
    checkoutAttempts.add(1);

    const res = http.post(`${app.baseURL}/order/api/mock-pay`, JSON.stringify({}), {
      headers: headers.json,
      redirects: 0,
      tags: { endpoint: 'checkout_mock_pay' },
      responseCallback: http.expectedStatuses(200, 400)
    });

    checkoutDuration.add(Date.now() - start);

    const handled = check(res, {
      'checkout status is 200/400': (r) => r.status === 200 || r.status === 400,
      'checkout has no 5xx': (r) => r.status < 500
    });

    if (!handled) {
      journeyHealthy = false;
      return;
    }

    if (res.status === 400) {
      checkoutRejected.add(1);
      return;
    }

    try {
      const body = res.json();
      const payloadOk = check(res, {
        'checkout success has orderId': () => Boolean(body && body.orderId)
      });

      if (payloadOk) {
        checkoutCompleted = true;
      } else {
        journeyHealthy = false;
      }
    } catch (_error) {
      journeyHealthy = false;
    }
  });

  if (journeyHealthy && checkoutCompleted) {
    fullJourneySuccess.add(1);
  }

  sleep(2);
}

export function teardown() {
  console.log(`\n[Teardown] Load Test Complete - mode=${TEST_MODE.toUpperCase()}\n`);
}

