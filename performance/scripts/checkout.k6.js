import http from 'k6/http';
import { group, sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { app } from '../lib/config.js';
import { spike } from '../scenarios/index.js';
import { headers } from '../lib/http.js';

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
    username: __ENV.PERF_USER || 'user',
    password: __ENV.PERF_PASSWORD || 'user123',
};

const CHECKOUT_MODE = String(__ENV.CHECKOUT_MODE || 'strict').toLowerCase() === 'acceptance'
    ? 'acceptance'
    : 'strict';

const RESET_STOCK = String(__ENV.PERF_RESET_STOCK || 'false').toLowerCase() === 'true';
const RESET_KEY = __ENV.RESET_KEY || __ENV.PERF_RESET_KEY || '';
const AUTO_REGISTER = String(__ENV.PERF_AUTO_REGISTER || 'false').toLowerCase() === 'true';
const AUTO_REGISTER_PASSWORD = __ENV.PERF_AUTO_REGISTER_PASSWORD || 'Pass12345!';
const DEBUG_UNEXPECTED = String(__ENV.PERF_DEBUG_UNEXPECTED || 'false').toLowerCase() === 'true';
const MAX_UNEXPECTED_LOGS = Number(__ENV.PERF_DEBUG_MAX_LOGS || 10);

const toPositiveInt = (value, fallback) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const PRODUCT_MIN = toPositiveInt(__ENV.PERF_PRODUCT_MIN, 1);
const PRODUCT_MAX = Math.max(PRODUCT_MIN, toPositiveInt(__ENV.PERF_PRODUCT_MAX, 9));

const productIdsFromCsv = new SharedArray('checkout_product_ids_from_csv', () => {
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

let isAuthenticated = false;
let vuUserInitialized = false;
let unexpectedLogCount = 0;
let vuCredentials = {
    username: TEST_USER.username,
    password: TEST_USER.password,
};

const strictCheckoutThresholds = {
    'http_req_duration{endpoint:checkout_mock_pay}': ['p(95)<1000'],
    'http_req_failed{endpoint:checkout_mock_pay}': ['rate==0.00'],
    checkout_unexpected: ['count==0'],
    checkout_attempts: ['count>0'],
};

const acceptanceCheckoutThresholds = {
    checkout_attempts: ['count>0'],
};

export const options = {
    scenarios: {
        // Checkout is often spike-loaded during promotions or flash sales.
        flash_sale: spike,
    },
    thresholds: CHECKOUT_MODE === 'strict' ? strictCheckoutThresholds : acceptanceCheckoutThresholds,
    tags: { checkout_mode: CHECKOUT_MODE },
};

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

function getInStockSourceIds(products) {
    const sourceIds = productIdsFromCsv.length > 0 ? productIdsFromCsv : fallbackProductIds;
    const sourceSet = new Set(sourceIds.map((id) => Number(id)));
    const inStock = [];

    for (let i = 0; i < products.length; i += 1) {
        const item = products[i] || {};
        const id = Number(item.id);
        const stock = Number(item.stock);

        if (Number.isInteger(id) && sourceSet.has(id) && Number.isFinite(stock) && stock > 0) {
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

function fetchProducts() {
    const productsRes = http.get(`${app.baseURL}/api/products`, {
        redirects: 0,
        tags: { endpoint: 'products_list' },
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

function setupStockIfNeeded() {
    if (!RESET_STOCK) {
        return;
    }

    if (!RESET_KEY) {
        console.warn('[Setup] PERF_RESET_STOCK=true but RESET_KEY is missing. Skipping stock reset.');
        return;
    }

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
        return;
    }

    console.warn(`[Setup] Stock reset returned status=${resetRes.status}. Continuing without reset.`);
}

export function setup() {
    const productSource = productIdsFromCsv.length > 0
        ? `csv(${productIdsFromCsv.length} ids)`
        : `fallback(${PRODUCT_MIN}-${PRODUCT_MAX})`;

    console.log(`[Setup] Checkout mode: ${CHECKOUT_MODE.toUpperCase()}`);
    console.log(`[Setup] Checkout test target: ${app.baseURL}`);
    console.log(`[Setup] Product source: ${productSource}`);

    setupStockIfNeeded();

    const availableProductIds = assertCheckoutPreconditions();
    return { availableProductIds };
}

function getLocation(res) {
    return String((res && (res.headers.Location || res.headers.location)) || '');
}

function isAuthFailureResponse(res) {
    if (!res) {
        return false;
    }

    if (res.status === 401) {
        return true;
    }

    if (res.status === 302 || res.status === 303) {
        return getLocation(res).includes('/login');
    }

    return false;
}

function isStockLimitResponse(res) {
    if (!res) {
        return false;
    }

    if (res.status === 302 || res.status === 303) {
        const location = getLocation(res);
        return location.includes('/cart?error=') && location.toLowerCase().includes('stock');
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
            password: vuCredentials.password,
        },
        {
            headers: headers.form,
            redirects: 0,
            tags: { endpoint: 'auth_login' },
        }
    );

    const loginLocation = String(loginRes.headers.Location || loginRes.headers.location || '');
    const ok = check(loginRes, {
        'login status is allowed (200/302/303)': (r) =>
            r.status === 200 || r.status === 302 || r.status === 303,
        'login does not redirect back to /login': () =>
            loginRes.status === 200 || !loginLocation.includes('/login'),
    });

    if (!ok) {
        isAuthenticated = false;
        return false;
    }

    const profileRes = http.get(`${app.baseURL}/profile`, {
        redirects: 0,
        tags: { endpoint: 'auth_profile' },
    });
    const profileOk = check(profileRes, {
        'profile is accessible after login': (r) => r.status === 200,
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
            email: `${unique}@example.com`,
            password: AUTO_REGISTER_PASSWORD,
            confirmPassword: AUTO_REGISTER_PASSWORD,
        },
        {
            headers: headers.form,
            redirects: 0,
            tags: { endpoint: 'auth_register' },
        }
    );

    const registerLocation = String(registerRes.headers.Location || registerRes.headers.location || '');
    const registerOk = check(registerRes, {
        'register status is allowed (200/302/303)': (r) =>
            r.status === 200 || r.status === 302 || r.status === 303,
        'register does not loop back to /register': () =>
            registerRes.status === 200 || !registerLocation.includes('/register'),
    });

    if (!registerOk) {
        return false;
    }

    vuCredentials = {
        username: unique,
        password: AUTO_REGISTER_PASSWORD,
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

    const setupProductIds = data && Array.isArray(data.availableProductIds)
        ? data.availableProductIds
        : null;
    const productId = pickProductIdFrom(setupProductIds);

    const cartReady = group('Setup: Add to Cart', () => {
        const addRes = withReauthRetry(() =>
            http.post(
                `${app.baseURL}/api/cart/add`,
                JSON.stringify({ productId, quantity: 1 }),
                {
                    headers: headers.json,
                    redirects: 0,
                    tags: { endpoint: 'cart_add' },
                    responseCallback: http.expectedStatuses(200, 302, 303, 400),
                }
            )
        );

        const handled = check(addRes, {
            'cart add handled': (r) => r.status === 200 || isStockLimitResponse(r),
            'cart add no 5xx': (r) => r.status < 500,
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
            http.post(
                `${app.baseURL}/order/api/mock-pay`,
                JSON.stringify({}),
                {
                    headers: headers.json,
                    redirects: 0,
                    tags: { endpoint: 'checkout_mock_pay' },
                    // 400 is expected when stock is depleted in high-concurrency spikes.
                    responseCallback: http.expectedStatuses(200, 302, 303, 400),
                }
            )
        );
        checkoutDuration.add(Date.now() - start);

        const handled = check(res, {
            'checkout status is 200 or 400': (r) => r.status === 200 || r.status === 400,
            'checkout has no server error': (r) => r.status < 500,
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
                    'successful checkout has status=success': () =>
                        Boolean(body && body.status === 'success'),
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
