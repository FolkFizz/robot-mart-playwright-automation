import http from 'k6/http';
import { group, sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { app, perfAuth } from '../lib/config.js';
import { headers } from '../lib/http.js';
import { soak } from '../scenarios/index.js';
import { soakThresholds } from '../thresholds/index.js';
import {
    toPositiveInt,
    createProductPool,
    fetchTargetProductIds,
    resetStockIfNeeded,
    getLocation,
    isAuthFailureResponse,
    isStockLimitResponse,
} from '../lib/perf-helpers.js';

/**
 * =============================================================================
 * SOAK TEST - Long-Duration Stability Validation
 * =============================================================================
 *
 * Workload per iteration:
 * 1) Ensure authenticated session
 * 2) Browse product listing API
 * 3) Add one item to cart
 * 4) Attempt mock checkout (200 success or controlled rejection)
 *
 * Notes:
 * - Use SOAK_QUICK=true for shorter local validation.
 * - Uses in-stock product IDs discovered during setup.
 * - checkout_attempts must be > 0 to avoid false-pass runs.
 * =============================================================================
 */

const QUICK_MODE = String(__ENV.SOAK_QUICK || 'false').toLowerCase() === 'true';
const RESET_STOCK = String(__ENV.PERF_RESET_STOCK || 'false').toLowerCase() === 'true';
const RESET_KEY = __ENV.RESET_KEY || __ENV.PERF_RESET_KEY || '';

const QUICK_SCENARIO = {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
        { duration: '20s', target: 10 },
        { duration: '30s', target: 10 },
        { duration: '20s', target: 0 },
    ],
    gracefulRampDown: '10s',
};

const TEST_USER = {
    username: perfAuth.username,
    password: perfAuth.password,
};

const PRODUCT_MIN = toPositiveInt(__ENV.PERF_PRODUCT_MIN, 1);
const PRODUCT_MAX = Math.max(PRODUCT_MIN, toPositiveInt(__ENV.PERF_PRODUCT_MAX, 9));

const productPool = createProductPool({
    sharedArrayName: 'soak_product_ids_from_csv',
    productMin: PRODUCT_MIN,
    productMax: PRODUCT_MAX,
});

const responseTimeOverTime = new Trend('response_time_over_time');
const errorsOverTime = new Counter('errors_over_time');
const iterationCount = new Counter('iteration_count');
const firstQuarterRT = new Trend('first_quarter_response_time');
const lastQuarterRT = new Trend('last_quarter_response_time');
const authAttempts = new Counter('auth_attempts');
const authFailures = new Counter('auth_failures');
const cartSuccess = new Counter('cart_success');
const cartRejected = new Counter('cart_rejected');
const checkoutAttempts = new Counter('checkout_attempts');
const checkoutRejected = new Counter('checkout_rejected');
const unexpectedResponses = new Counter('unexpected_responses');

const soakCustomThresholds = {
    ...soakThresholds,
    checkout_attempts: ['count>0'],
};

let isAuthenticated = false;

export const options = {
    scenarios: {
        soak_test: QUICK_MODE ? QUICK_SCENARIO : soak,
    },
    thresholds: soakCustomThresholds,
    tags: { run_mode: QUICK_MODE ? 'quick' : 'full' },
};

function trackResponseTime(duration, elapsedMinutes, durationMinutes) {
    responseTimeOverTime.add(duration);

    if (durationMinutes <= 0) {
        return;
    }

    if (elapsedMinutes <= durationMinutes / 4) {
        firstQuarterRT.add(duration);
        return;
    }

    if (elapsedMinutes >= (durationMinutes * 3) / 4) {
        lastQuarterRT.add(duration);
    }
}

function markUnexpected(res) {
    unexpectedResponses.add(1);
    errorsOverTime.add(1);
    if (isAuthFailureResponse(res)) {
        isAuthenticated = false;
    }
}

function ensureAuthenticated() {
    if (isAuthenticated) {
        return true;
    }

    authAttempts.add(1);

    const loginRes = http.post(
        `${app.baseURL}/login`,
        {
            username: TEST_USER.username,
            password: TEST_USER.password,
        },
        {
            headers: headers.form,
            redirects: 0,
            tags: { endpoint: 'auth_login' },
        }
    );

    const loginLocation = getLocation(loginRes);
    const loginOk = check(loginRes, {
        'soak login status is 200/302/303': (r) =>
            r.status === 200 || r.status === 302 || r.status === 303,
        'soak login not redirected back to /login': () =>
            loginRes.status === 200 || !loginLocation.includes('/login'),
    });

    if (!loginOk) {
        authFailures.add(1);
        markUnexpected(loginRes);
        return false;
    }

    const profileRes = http.get(`${app.baseURL}/profile`, {
        redirects: 0,
        tags: { endpoint: 'auth_profile' },
    });
    const profileOk = check(profileRes, {
        'soak profile is accessible': (r) => r.status === 200,
    });

    if (!profileOk) {
        authFailures.add(1);
        markUnexpected(profileRes);
        return false;
    }

    isAuthenticated = true;
    return true;
}

function withReauthRetry(requestFn) {
    let res = requestFn();
    if (isAuthFailureResponse(res)) {
        isAuthenticated = false;
        if (ensureAuthenticated()) {
            res = requestFn();
        }
    }
    return res;
}

export function setup() {
    const productSource = productPool.getSourceLabel();

    console.log(`[Setup] Soak Test - Target: ${app.baseURL} (mode=${QUICK_MODE ? 'quick' : 'full'})`);
    console.log(`[Setup] Product source: ${productSource}`);

    resetStockIfNeeded({ enabled: RESET_STOCK, resetKey: RESET_KEY });

    const selectedProductIds = fetchTargetProductIds(productPool.preferredIds);
    console.log(`[Setup] In-stock target pool: ${selectedProductIds.length}`);

    if (selectedProductIds.length === 0) {
        throw new Error(
            'No in-stock products available for soak checkout path. ' +
            'Set PERF_RESET_STOCK=true with RESET_KEY or replenish inventory before running soak test.'
        );
    }

    return {
        startTimeMs: Date.now(),
        plannedDurationMinutes: QUICK_MODE ? 1.2 : 30,
        selectedProductIds,
    };
}

export default function (data) {
    const elapsedMinutes = (Date.now() - data.startTimeMs) / 1000 / 60;
    const durationMinutes = Number(data.plannedDurationMinutes || (QUICK_MODE ? 1.2 : 30));
    const selectedProductIds = Array.isArray(data.selectedProductIds) ? data.selectedProductIds : null;

    iterationCount.add(1);

    if (!ensureAuthenticated()) {
        sleep(0.5);
        return;
    }

    let cartReady = false;

    group('Browse', () => {
        const startedAt = Date.now();
        const res = withReauthRetry(() =>
            http.get(`${app.baseURL}/api/products`, {
                redirects: 0,
                tags: { endpoint: 'browse_products' },
            })
        );

        const duration = Date.now() - startedAt;
        trackResponseTime(duration, elapsedMinutes, durationMinutes);

        const ok = check(res, {
            'soak browse status is 200': (r) => r.status === 200,
            'soak browse returns json': (r) =>
                String(r.headers['Content-Type'] || r.headers['content-type'] || '').includes('application/json'),
        });

        if (!ok) {
            markUnexpected(res);
        }
    });

    group('Cart', () => {
        const startedAt = Date.now();
            const res = withReauthRetry(() =>
                http.post(
                    `${app.baseURL}/api/cart/add`,
                    JSON.stringify({ productId: productPool.pickProductIdFrom(selectedProductIds), quantity: 1 }),
                    {
                        headers: headers.json,
                    redirects: 0,
                    tags: { endpoint: 'cart_add' },
                    responseCallback: http.expectedStatuses(200, 302, 303, 400),
                }
            )
        );

        const duration = Date.now() - startedAt;
        trackResponseTime(duration, elapsedMinutes, durationMinutes);

        const handled = check(res, {
            'soak cart add handled': (r) => r.status === 200 || isStockLimitResponse(r),
            'soak cart add no 5xx': (r) => r.status < 500,
        });

        if (res.status === 200) {
            cartSuccess.add(1);
            cartReady = true;
            return;
        }

        if (isStockLimitResponse(res)) {
            cartRejected.add(1);
            return;
        }

        if (!handled) {
            markUnexpected(res);
        }
    });

    if (cartReady) {
        group('Checkout', () => {
            const startedAt = Date.now();
            checkoutAttempts.add(1);

            const res = withReauthRetry(() =>
                http.post(
                    `${app.baseURL}/order/api/mock-pay`,
                    JSON.stringify({}),
                    {
                        headers: headers.json,
                        redirects: 0,
                        tags: { endpoint: 'checkout_mock_pay' },
                        responseCallback: http.expectedStatuses(200, 302, 303, 400),
                    }
                )
            );

            const duration = Date.now() - startedAt;
            trackResponseTime(duration, elapsedMinutes, durationMinutes);

            const handled = check(res, {
                'soak checkout handled': (r) => r.status === 200 || isStockLimitResponse(r),
                'soak checkout no 5xx': (r) => r.status < 500,
            });

            if (!handled) {
                markUnexpected(res);
                return;
            }

            if (isStockLimitResponse(res)) {
                checkoutRejected.add(1);
                return;
            }

            try {
                const body = res.json();
                const payloadOk = check(res, {
                    'soak checkout success has orderId': () => Boolean(body && body.orderId),
                });

                if (!payloadOk) {
                    markUnexpected(res);
                }
            } catch (_error) {
                markUnexpected(res);
            }
        });
    }

    sleep(0.8 + Math.random() * 0.4);
}

export function teardown() {
    console.log('\n========================================');
    console.log('SOAK TEST ANALYSIS');
    console.log('========================================');
    console.log(`Mode: ${QUICK_MODE ? 'quick' : 'full'}`);
    console.log('Review first_quarter_response_time vs last_quarter_response_time.');
    console.log('If last quarter is slower with rising errors, investigate leaks or exhaustion.');
    console.log('========================================\n');
}
