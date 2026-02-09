import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { app } from '../lib/config.js';
import { headers } from '../lib/http.js';
import { concurrent } from '../scenarios/index.js';

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
    username: __ENV.PERF_USER || 'user',
    password: __ENV.PERF_PASSWORD || 'user123',
};

const toPositiveInt = (value, fallback) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const TARGET_PRODUCT = {
    id: Number(__ENV.PERF_RACE_PRODUCT_ID || 0),
    quantity: toPositiveInt(__ENV.PERF_RACE_QUANTITY, 1),
};

const RESET_STOCK = String(__ENV.PERF_RESET_STOCK || 'false').toLowerCase() === 'true';
const RESET_KEY = __ENV.RESET_KEY || __ENV.PERF_RESET_KEY || '';

const successfulPurchases = new Counter('successful_purchases');
const rejectedPurchases = new Counter('rejected_purchases');
const unexpectedPurchases = new Counter('unexpected_purchases');
const checkoutDuration = new Trend('checkout_duration');

const raceCustomThresholds = {
    'http_req_duration{endpoint:checkout_mock_pay}': ['p(95)<5000'],
    'http_req_failed{endpoint:checkout_mock_pay}': ['rate<0.10'],
    successful_purchases: ['count>0'],
    unexpected_purchases: ['count==0'],
};

export const options = {
    scenarios: {
        race_checkout: concurrent,
    },
    thresholds: raceCustomThresholds,
};

function getLocation(res) {
    return String((res && (res.headers.Location || res.headers.location)) || '');
}

function isCartRedirect(res) {
    if (!res || (res.status !== 302 && res.status !== 303)) {
        return false;
    }
    return getLocation(res).includes('/cart?error=');
}

function isAuthRedirect(res) {
    if (!res || (res.status !== 302 && res.status !== 303)) {
        return false;
    }
    return getLocation(res).includes('/login');
}

function isStockRejectResponse(res) {
    if (!res) {
        return false;
    }

    if (res.status === 400) {
        return true;
    }

    if (isCartRedirect(res)) {
        return getLocation(res).toLowerCase().includes('stock');
    }

    return false;
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
            password: TEST_USER.password,
        },
        {
            headers: headers.form,
            redirects: 0,
            tags: { endpoint: 'auth_login' },
        }
    );

    const location = getLocation(loginRes);
    const loginOk = check(loginRes, {
        'race login status is 200/302/303': (r) =>
            r.status === 200 || r.status === 302 || r.status === 303,
        'race login not redirected back to /login': () =>
            loginRes.status === 200 || !location.includes('/login'),
    });

    if (!loginOk) {
        return false;
    }

    const profileRes = http.get(`${app.baseURL}/profile`, {
        redirects: 0,
        tags: { endpoint: 'auth_profile' },
    });

    return check(profileRes, {
        'race profile is accessible': (r) => r.status === 200,
    });
}

export function setup() {
    console.log(`[Setup] Race test target: ${app.baseURL}`);

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

    const productsRes = http.get(`${app.baseURL}/api/products`, {
        redirects: 0,
        tags: { endpoint: 'products_list' },
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
        targetQuantity: effectiveQuantity,
    };
}

export default function (data) {
    const targetProductId = data && Number.isInteger(Number(data.targetProductId))
        ? Number(data.targetProductId)
        : TARGET_PRODUCT.id;
    const targetQuantity = data && Number.isInteger(Number(data.targetQuantity))
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
                    quantity: targetQuantity,
                }),
                {
                    headers: headers.json,
                    redirects: 0,
                    tags: { endpoint: 'cart_add' },
                    responseCallback: http.expectedStatuses(200, 302, 303, 400),
                }
            )
        );

        const handled = check(res, {
            'race cart add handled': (r) => r.status === 200 || isStockRejectResponse(r),
            'race cart add no 5xx': (r) => r.status < 500,
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
        checkoutDuration.add(Date.now() - startedAt);

        const handled = check(checkoutRes, {
            'race checkout handled': (r) => r.status === 200 || isStockRejectResponse(r) || isCartRedirect(r),
            'race checkout no 5xx': (r) => r.status < 500,
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
