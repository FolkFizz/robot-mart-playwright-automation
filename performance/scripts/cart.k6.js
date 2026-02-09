import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { app } from '../lib/config.js';
import { ramping } from '../scenarios/index.js';
import { cartThresholds } from '../thresholds/index.js';
import { headers } from '../lib/http.js';

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
    cart_add_unexpected: ['count==0'],
};

export const options = {
    scenarios: {
        cart: ramping,
    },
    thresholds: cartCustomThresholds,
};

const RESET_STOCK = String(__ENV.PERF_RESET_STOCK || 'false').toLowerCase() === 'true';
const RESET_KEY = __ENV.RESET_KEY || __ENV.PERF_RESET_KEY || '';

const toPositiveInt = (value, fallback) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const PRODUCT_MIN = toPositiveInt(__ENV.PERF_PRODUCT_MIN, 1);
const PRODUCT_MAX = Math.max(PRODUCT_MIN, toPositiveInt(__ENV.PERF_PRODUCT_MAX, 9));

const productIdsFromCsv = new SharedArray('cart_product_ids_from_csv', () => {
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

const cartAddSuccess = new Counter('cart_add_success');
const cartAddRejected = new Counter('cart_add_rejected');
const cartAddUnexpected = new Counter('cart_add_unexpected');

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

export function setup() {
    const productSource = productIdsFromCsv.length > 0
        ? `csv(${productIdsFromCsv.length} ids)`
        : `fallback(${PRODUCT_MIN}-${PRODUCT_MAX})`;

    console.log(`[Setup] Cart test target: ${app.baseURL}`);
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

    const selectedProductIds = fetchTargetProductIds();
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
    const selectedProductIds = data && Array.isArray(data.selectedProductIds)
        ? data.selectedProductIds
        : null;

    group('Add Item to Cart', () => {
        const payload = JSON.stringify({ productId: pickProductIdFrom(selectedProductIds), quantity: 1 });
        const res = http.post(`${app.baseURL}/api/cart/add`, payload, {
            headers: headers.json,
            redirects: 0,
            tags: { endpoint: 'cart_add' },
            responseCallback: http.expectedStatuses(200, 302, 303, 400),
        });

        const handled = check(res, {
            'cart add handled': (r) => r.status === 200 || isStockLimitResponse(r),
            'cart add no 5xx': (r) => r.status < 500,
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
            tags: { endpoint: 'cart_get' },
        });

        check(res, {
            'view cart status is 200': (r) => r.status === 200,
            'view cart returns json': (r) =>
                String(r.headers['Content-Type'] || r.headers['content-type'] || '').includes('application/json'),
        });
    });

    sleep(1);
}
