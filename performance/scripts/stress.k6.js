import http from 'k6/http';
import { group, sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { app, perfAuth } from '../lib/config.js';
import { headers } from '../lib/http.js';
import { stress } from '../scenarios/index.js';
import { stressThresholds } from '../thresholds/index.js';

/**
 * =============================================================================
 * STRESS TEST - Finding the System Breaking Point
 * =============================================================================
 *
 * Workload Mix:
 * - 50% Browse API reads (GET /api/products)
 * - 30% Cart writes (POST /api/cart/add)
 * - 20% Checkout attempts (POST /order/api/mock-pay)
 *
 * Notes:
 * - A VU maintains session and re-authenticates when needed.
 * - Checkout and cart stock rejections are treated as expected business outcomes.
 * - Use STRESS_QUICK=true for shorter local validation runs.
 * =============================================================================
 */

const QUICK_MODE = String(__ENV.STRESS_QUICK || 'false').toLowerCase() === 'true';
const RESET_STOCK = String(__ENV.PERF_RESET_STOCK || 'false').toLowerCase() === 'true';
const RESET_KEY = __ENV.RESET_KEY || __ENV.PERF_RESET_KEY || '';
const DEBUG_UNEXPECTED = String(__ENV.PERF_DEBUG_UNEXPECTED || 'false').toLowerCase() === 'true';

const QUICK_SCENARIO = {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
        { duration: '20s', target: 20 },
        { duration: '30s', target: 40 },
        { duration: '20s', target: 0 },
    ],
    gracefulRampDown: '10s',
};

const TEST_USER = {
    username: perfAuth.username,
    password: perfAuth.password,
};

const toPositiveInt = (value, fallback) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const MAX_DEBUG_LOGS = toPositiveInt(__ENV.PERF_DEBUG_MAX_LOGS, 10);
const PRODUCT_MIN = toPositiveInt(__ENV.PERF_STRESS_PRODUCT_MIN, 1);
const PRODUCT_MAX = Math.max(PRODUCT_MIN, toPositiveInt(__ENV.PERF_STRESS_PRODUCT_MAX, 9));

const productIdsFromCsv = new SharedArray('stress_product_ids_from_csv', () => {
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

function pickProductId() {
    const source = productIdsFromCsv.length > 0 ? productIdsFromCsv : fallbackProductIds;
    return source[Math.floor(Math.random() * source.length)];
}

function pickProductIdFrom(preferredIds) {
    if (Array.isArray(preferredIds) && preferredIds.length > 0) {
        return preferredIds[Math.floor(Math.random() * preferredIds.length)];
    }

    return pickProductId();
}

function parseProductsPayload(res) {
    if (!res || res.status !== 200) {
        return [];
    }

    try {
        const body = res.json();
        if (!body || body.ok !== true || !Array.isArray(body.products)) {
            return [];
        }
        return body.products;
    } catch (_error) {
        return [];
    }
}

function getInStockPreferredIds(products) {
    const preferredIds = productIdsFromCsv.length > 0 ? productIdsFromCsv : fallbackProductIds;
    const preferredSet = new Set(preferredIds.map((id) => Number(id)));
    const inStock = [];

    for (let i = 0; i < products.length; i += 1) {
        const item = products[i] || {};
        const id = Number(item.id);
        const stock = Number(item.stock);

        if (Number.isInteger(id) && preferredSet.has(id) && Number.isFinite(stock) && stock > 0) {
            inStock.push(id);
        }
    }

    return inStock;
}

function getInStockAnyIds(products) {
    const inStock = [];

    for (let i = 0; i < products.length; i += 1) {
        const item = products[i] || {};
        const id = Number(item.id);
        const stock = Number(item.stock);

        if (Number.isInteger(id) && Number.isFinite(stock) && stock > 0) {
            inStock.push(id);
        }
    }

    return inStock;
}

function fetchTargetProductIds() {
    const productsRes = http.get(`${app.baseURL}/api/products`, {
        redirects: 0,
        tags: { endpoint: 'products_list' },
    });

    const products = parseProductsPayload(productsRes);
    if (products.length === 0) {
        return [];
    }

    const preferredInStock = getInStockPreferredIds(products);
    if (preferredInStock.length > 0) {
        return preferredInStock;
    }

    return getInStockAnyIds(products);
}

// Custom metrics to track degradation and failure type
const performanceScore = new Trend('performance_score');
const errorsByStage = new Counter('errors_by_stage');
const authAttempts = new Counter('auth_attempts');
const authFailures = new Counter('auth_failures');
const cartSuccess = new Counter('cart_success');
const cartRejected = new Counter('cart_rejected');
const cartUnexpected = new Counter('cart_unexpected');
const checkoutAttempts = new Counter('checkout_attempts');
const checkoutRejected = new Counter('checkout_rejected');
const checkoutUnexpected = new Counter('checkout_unexpected');

let isAuthenticated = false;
let unexpectedLogCount = 0;

const stressCustomThresholds = {
    ...stressThresholds,
    checkout_attempts: ['count>0'],
};

export const options = {
    scenarios: {
        stress_test: QUICK_MODE ? QUICK_SCENARIO : stress,
    },
    thresholds: stressCustomThresholds,
    tags: { run_mode: QUICK_MODE ? 'quick' : 'full' },
};

export function setup() {
    const productSource = productIdsFromCsv.length > 0
        ? `csv(${productIdsFromCsv.length} ids)`
        : `fallback(${PRODUCT_MIN}-${PRODUCT_MAX})`;

    console.log(`[Setup] Stress Test - Target: ${app.baseURL} (mode=${QUICK_MODE ? 'quick' : 'full'})`);
    console.log('[Setup] Ramping load to find breaking point...');
    console.log(`[Setup] Product source: ${productSource}`);
    console.log('[Setup] Mix: browse(50%), cart(30%), checkout(20%)');
    console.log('[Setup] Watch for: performance degradation, error spikes, timeouts');

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

    const selectedProductIds = fetchTargetProductIds();
    console.log(`[Setup] In-stock target pool: ${selectedProductIds.length}`);
    if (selectedProductIds.length === 0) {
        console.warn('[Setup] No in-stock product IDs found. Stress cart path may be mostly rejections.');
    }

    return { selectedProductIds };
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

function logUnexpected(endpoint, res) {
    if (!DEBUG_UNEXPECTED || unexpectedLogCount >= MAX_DEBUG_LOGS) {
        return;
    }

    unexpectedLogCount += 1;
    console.warn(
        `[stress][${endpoint}] status=${res ? res.status : 'none'} location=${getLocation(res)} body=${String((res && res.body) || '').slice(0, 180)}`
    );
}

function markError(res) {
    errorsByStage.add(1);
    if (isAuthFailureResponse(res)) {
        isAuthenticated = false;
    }
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

    const redirectLocation = String(loginRes.headers.Location || loginRes.headers.location || '');
    const loginOk = check(loginRes, {
        'stress login status is 200/302/303': (r) =>
            r.status === 200 || r.status === 302 || r.status === 303,
        'stress login not redirected to /login': () =>
            loginRes.status === 200 || !redirectLocation.includes('/login'),
    });

    if (!loginOk) {
        authFailures.add(1);
        markError(loginRes);
        return false;
    }

    const profileRes = http.get(`${app.baseURL}/profile`, {
        redirects: 0,
        tags: { endpoint: 'auth_profile' },
    });
    const profileOk = check(profileRes, {
        'stress profile is accessible': (r) => r.status === 200,
    });

    if (!profileOk) {
        authFailures.add(1);
        markError(profileRes);
        return false;
    }

    isAuthenticated = true;
    return true;
}

export default function (data) {
    if (!ensureAuthenticated()) {
        sleep(0.5);
        return;
    }

    const selectedProductIds = data && Array.isArray(data.selectedProductIds)
        ? data.selectedProductIds
        : null;

    // Weighted operation mix
    const rand = Math.random();
    if (rand < 0.5) {
        browseProducts();
    } else if (rand < 0.8) {
        addToCart(selectedProductIds);
    } else {
        checkout();
    }

    sleep(0.3 + Math.random() * 0.3);
}

function browseProducts() {
    group('Browse', () => {
        const startTime = Date.now();
        const res = withReauthRetry(() =>
            http.get(`${app.baseURL}/api/products`, {
                redirects: 0,
                tags: { endpoint: 'browse_products' },
            })
        );
        const duration = Date.now() - startTime;

        performanceScore.add(duration);

        const success = check(res, {
            'browse successful': (r) => r.status === 200,
            'browse returns json': (r) =>
                String(r.headers['Content-Type'] || r.headers['content-type'] || '').includes('application/json'),
        });

        if (!success) {
            logUnexpected('browse_products', res);
            markError(res);
        }
    });
}

function addToCart(selectedProductIds) {
    group('Cart', () => {
        const startTime = Date.now();
        const res = withReauthRetry(() =>
            http.post(
                `${app.baseURL}/api/cart/add`,
                JSON.stringify({
                    productId: pickProductIdFrom(selectedProductIds),
                    quantity: 1,
                }),
                {
                    headers: headers.json,
                    redirects: 0,
                    tags: { endpoint: 'cart_add' },
                    responseCallback: http.expectedStatuses(200, 302, 303, 400),
                }
            )
        );
        const duration = Date.now() - startTime;

        performanceScore.add(duration);

        check(res, {
            'cart add handled': (r) => r.status === 200 || isStockLimitResponse(r),
            'cart add no 5xx': (r) => r.status < 500,
        });

        if (res.status === 200) {
            cartSuccess.add(1);
            return;
        }

        if (isStockLimitResponse(res)) {
            cartRejected.add(1);
            return;
        }

        cartUnexpected.add(1);
        logUnexpected('cart_add', res);
        markError(res);
    });
}

function checkout() {
    group('Checkout', () => {
        const startTime = Date.now();
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
        const duration = Date.now() - startTime;

        performanceScore.add(duration);

        const handled = check(res, {
            'checkout status is handled': (r) => r.status === 200 || r.status === 400 || isCartRedirect(r),
            'checkout no 5xx': (r) => r.status < 500,
        });

        if (!handled) {
            checkoutUnexpected.add(1);
            logUnexpected('checkout_mock_pay', res);
            markError(res);
            return;
        }

        if (res.status === 400 || isCartRedirect(res)) {
            checkoutRejected.add(1);
            return;
        }

        try {
            const body = res.json();
            const payloadOk = check(res, {
                'checkout success has orderId': () => Boolean(body && body.orderId),
            });
            if (!payloadOk) {
                checkoutUnexpected.add(1);
                logUnexpected('checkout_mock_pay', res);
                markError(res);
            }
        } catch (_error) {
            checkoutUnexpected.add(1);
            logUnexpected('checkout_mock_pay', res);
            markError(res);
        }
    });
}

export function teardown() {
    console.log('\n========================================');
    console.log('STRESS TEST ANALYSIS');
    console.log('========================================');
    console.log(`Test Type: Breaking Point Discovery (${QUICK_MODE ? 'quick' : 'full'} mode)`);
    console.log('\nAnalysis Points:');
    console.log('   1. At what VU count did errors start?');
    console.log('   2. At what VU count did response time degrade?');
    console.log('   3. Did the system recover gracefully?');
    console.log('   4. Which endpoints failed first?');
    console.log('\nNext Steps:');
    console.log('   - Review error_rate trend in results');
    console.log('   - Check performance_score degradation');
    console.log('   - Set auto-scaling threshold before breaking point');
    console.log('========================================\n');
}
