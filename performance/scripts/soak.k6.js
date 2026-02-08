import http from 'k6/http';
import { group, sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { app } from '../lib/config.js';
import { headers } from '../lib/http.js';
import { soak } from '../scenarios/index.js';
import { soakThresholds } from '../thresholds/index.js';

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
 * - Cart stock-limit rejections are treated as expected business outcomes.
 * - Checkout HTTP 400 and cart guard redirects are treated as controlled rejections.
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
    username: __ENV.PERF_USER || 'user',
    password: __ENV.PERF_PASSWORD || 'user123',
};

const toPositiveInt = (value, fallback) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const PRODUCT_MIN = toPositiveInt(__ENV.PERF_PRODUCT_MIN, 1);
const PRODUCT_MAX = Math.max(PRODUCT_MIN, toPositiveInt(__ENV.PERF_PRODUCT_MAX, 9));

const productIdsFromCsv = new SharedArray('soak_product_ids_from_csv', () => {
    try {
        const csv = open('../data/products.csv');
        const rows = csv
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        if (rows.length <= 1) {
            return [];
        }

        const ids = [];
        for (let i = 1; i < rows.length; i += 1) {
            const [rawId] = rows[i].split(',');
            const parsedId = Number(rawId);
            if (Number.isInteger(parsedId) && parsedId > 0) {
                ids.push(parsedId);
            }
        }

        return ids;
    } catch (_error) {
        return [];
    }
});

const fallbackProductIds = (() => {
    const ids = [];
    for (let id = PRODUCT_MIN; id <= PRODUCT_MAX; id += 1) {
        ids.push(id);
    }
    return ids;
})();

const responseTimeOverTime = new Trend('response_time_over_time');
const errorsOverTime = new Counter('errors_over_time');
const iterationCount = new Counter('iteration_count');
const firstQuarterRT = new Trend('first_quarter_response_time');
const lastQuarterRT = new Trend('last_quarter_response_time');
const authAttempts = new Counter('auth_attempts');
const authFailures = new Counter('auth_failures');
const cartRejected = new Counter('cart_rejected');
const checkoutRejected = new Counter('checkout_rejected');
const unexpectedResponses = new Counter('unexpected_responses');

let isAuthenticated = false;

export const options = {
    scenarios: {
        soak_test: QUICK_MODE ? QUICK_SCENARIO : soak,
    },
    thresholds: soakThresholds,
    tags: { run_mode: QUICK_MODE ? 'quick' : 'full' },
};

function pickProductId() {
    const source = productIdsFromCsv.length > 0 ? productIdsFromCsv : fallbackProductIds;
    return source[Math.floor(Math.random() * source.length)];
}

function getLocation(res) {
    return String((res && (res.headers.Location || res.headers.location)) || '');
}

function isAuthRedirect(res) {
    if (!res || (res.status !== 302 && res.status !== 303)) {
        return false;
    }
    return getLocation(res).includes('/login');
}

function isAuthFailureResponse(res) {
    if (!res) {
        return false;
    }
    return res.status === 401 || isAuthRedirect(res);
}

function isCartRedirect(res) {
    if (!res || (res.status !== 302 && res.status !== 303)) {
        return false;
    }
    return getLocation(res).includes('/cart?error=');
}

function isStockLimitResponse(res) {
    if (!res) {
        return false;
    }

    if (isCartRedirect(res)) {
        return getLocation(res).toLowerCase().includes('stock');
    }

    if (res.status !== 400) {
        return false;
    }

    try {
        const body = res.json();
        const message = String((body && body.message) || '').toLowerCase();
        return message.includes('stock');
    } catch (_error) {
        return String(res.body || '').toLowerCase().includes('stock');
    }
}

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
    const productSource = productIdsFromCsv.length > 0
        ? `csv(${productIdsFromCsv.length} ids)`
        : `fallback(${PRODUCT_MIN}-${PRODUCT_MAX})`;

    console.log(`[Setup] Soak Test - Target: ${app.baseURL} (mode=${QUICK_MODE ? 'quick' : 'full'})`);
    console.log(`[Setup] Product source: ${productSource}`);

    if (RESET_STOCK) {
        if (!RESET_KEY) {
            console.warn('[Setup] PERF_RESET_STOCK=true but RESET_KEY is missing. Skipping stock reset.');
        } else {
            const resetRes = http.post(
                `${app.baseURL}/api/products/reset-stock`,
                null,
                {
                    headers: { 'X-RESET-KEY': RESET_KEY },
                    redirects: 0,
                    tags: { endpoint: 'reset_stock' },
                    responseCallback: http.expectedStatuses(200, 403),
                }
            );

            if (resetRes.status === 200) {
                console.log('[Setup] Stock reset completed.');
            } else {
                console.warn(`[Setup] Stock reset returned status=${resetRes.status}. Continuing without reset.`);
            }
        }
    }

    return {
        startTimeMs: Date.now(),
        plannedDurationMinutes: QUICK_MODE ? 1.2 : 30,
    };
}

export default function (data) {
    const elapsedMinutes = (Date.now() - data.startTimeMs) / 1000 / 60;
    const durationMinutes = Number(data.plannedDurationMinutes || (QUICK_MODE ? 1.2 : 30));

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
                JSON.stringify({ productId: pickProductId(), quantity: 1 }),
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
                'soak checkout handled': (r) => r.status === 200 || r.status === 400 || isCartRedirect(r),
                'soak checkout no 5xx': (r) => r.status < 500,
            });

            if (!handled) {
                markUnexpected(res);
                return;
            }

            if (res.status === 400 || isCartRedirect(res)) {
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
