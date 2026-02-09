import http from 'k6/http';
import { group, sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { app } from '../lib/config.js';
import { headers } from '../lib/http.js';

/**
 * =============================================================================
 * CONFIGURABLE LOAD TEST - End-to-End Customer Journey
 * =============================================================================
 *
 * Flow per iteration:
 * 1) Login
 * 2) Browse home page
 * 3) Add random product to cart
 * 4) Attempt mock checkout
 *
 * Modes (TEST_MODE):
 * - balanced (default): Enforce thresholds
 * - acceptance: Measurement only (no thresholds)
 *
 * Notes:
 * - Checkout uses POST /order/api/mock-pay.
 * - HTTP 400 at checkout is treated as expected business rejection (e.g. stock depletion).
 * - Optional stock reset before setup: PERF_RESET_STOCK=true with RESET_KEY.
 * - Balanced mode requires at least one in-stock target product; setup fails fast otherwise.
 * - full_journey_success is counted only when checkout returns a successful order.
 * =============================================================================
 */

const toPositiveInt = (value, fallback) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const TEST_MODE = String(__ENV.TEST_MODE || 'balanced').toLowerCase() === 'acceptance'
    ? 'acceptance'
    : 'balanced';

const TEST_USER = {
    username: __ENV.PERF_USER || 'user',
    password: __ENV.PERF_PASSWORD || 'user123',
};

const RESET_STOCK = String(__ENV.PERF_RESET_STOCK || 'false').toLowerCase() === 'true';
const RESET_KEY = __ENV.RESET_KEY || __ENV.PERF_RESET_KEY || '';

const PRODUCT_MIN = toPositiveInt(__ENV.PERF_PRODUCT_MIN, 1);
const PRODUCT_MAX = Math.max(PRODUCT_MIN, toPositiveInt(__ENV.PERF_PRODUCT_MAX, 205));

const productIdsFromCsv = new SharedArray('product_ids_from_csv', () => {
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

function getLocation(res) {
    return String((res && (res.headers.Location || res.headers.location)) || '');
}

function isStockLimitResponse(res) {
    if (!res) {
        return false;
    }

    if ((res.status === 302 || res.status === 303) && getLocation(res).includes('/cart?error=')) {
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

const baseOptions = {
    stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
    ],
};

const thresholdsByMode = {
    balanced: {
        http_req_failed: ['rate<0.10'],
        http_req_duration: ['p(95)<1500', 'p(99)<3000'],
        login_duration: ['p(95)<800'],
        browse_duration: ['p(95)<1000'],
        cart_duration: ['p(95)<500'],
        checkout_duration: ['p(95)<800'],
        checkout_attempts: ['count>0'],
    },
    acceptance: {},
};

export const options = {
    ...baseOptions,
    thresholds: thresholdsByMode[TEST_MODE],
    tags: { test_mode: TEST_MODE },
};

export function setup() {
    const productSource = productIdsFromCsv.length > 0
        ? `csv(${productIdsFromCsv.length} ids)`
        : `fallback(${PRODUCT_MIN}-${PRODUCT_MAX})`;

    setupStockIfNeeded();

    const selectedProductIds = fetchTargetProductIds();

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

        console.warn('[Setup] No in-stock product IDs discovered. Acceptance mode will measure browse/login only.');
    }

    console.log('');
    return { selectedProductIds };
}

export default function (data) {
    let journeyHealthy = true;
    let checkoutCompleted = false;
    const selectedProductIds = data && Array.isArray(data.selectedProductIds)
        ? data.selectedProductIds
        : null;

    const loginOk = group('Login', () => {
        const start = Date.now();
        loginAttempts.add(1);

        const res = http.post(
            `${app.baseURL}/login`,
            { username: TEST_USER.username, password: TEST_USER.password },
            {
                headers: headers.form,
                redirects: 0,
                tags: { endpoint: 'login' },
            }
        );

        loginDuration.add(Date.now() - start);

        const redirectLocation = String(res.headers.Location || res.headers.location || '');
        return check(res, {
            'login status is 200/302/303': (r) => r.status === 200 || r.status === 302 || r.status === 303,
            'login not redirected back to /login': () => res.status === 200 || !redirectLocation.includes('/login'),
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
            tags: { endpoint: 'home' },
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
            JSON.stringify({ productId: pickProductIdFrom(selectedProductIds), quantity: 1 }),
            {
                headers: headers.json,
                redirects: 0,
                tags: { endpoint: 'cart_add' },
                responseCallback: http.expectedStatuses(200, 302, 303, 400),
            }
        );

        cartDuration.add(Date.now() - start);
        const handled = check(res, {
            'cart handled': (r) => r.status === 200 || isStockLimitResponse(r),
            'cart no 5xx': (r) => r.status < 500,
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

        const res = http.post(
            `${app.baseURL}/order/api/mock-pay`,
            JSON.stringify({}),
            {
                headers: headers.json,
                redirects: 0,
                tags: { endpoint: 'checkout_mock_pay' },
                responseCallback: http.expectedStatuses(200, 400),
            }
        );

        checkoutDuration.add(Date.now() - start);

        const handled = check(res, {
            'checkout status is 200/400': (r) => r.status === 200 || r.status === 400,
            'checkout has no 5xx': (r) => r.status < 500,
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
                'checkout success has orderId': () => Boolean(body && body.orderId),
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
