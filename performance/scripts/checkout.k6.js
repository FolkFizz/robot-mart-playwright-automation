import http from 'k6/http';
import { group, sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
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
 * - Uses mock payment intentionally to avoid calling real Stripe API.
 * - 400 responses are treated as expected business outcomes (not transport errors).
 * 
 * =============================================================================
 */

// Metrics for outcome-level analysis
const checkoutSuccess = new Counter('checkout_success');
const checkoutRejected = new Counter('checkout_rejected');
const checkoutUnexpected = new Counter('checkout_unexpected');
const checkoutDuration = new Trend('checkout_duration');

const TEST_USER = {
    username: __ENV.PERF_USER || 'user',
    password: __ENV.PERF_PASSWORD || 'user123',
};

const AUTO_REGISTER = String(__ENV.PERF_AUTO_REGISTER || 'false').toLowerCase() === 'true';
const AUTO_REGISTER_PASSWORD = __ENV.PERF_AUTO_REGISTER_PASSWORD || 'Pass12345!';
const DEBUG_UNEXPECTED = String(__ENV.PERF_DEBUG_UNEXPECTED || 'false').toLowerCase() === 'true';
const MAX_UNEXPECTED_LOGS = Number(__ENV.PERF_DEBUG_MAX_LOGS || 10);

let isAuthenticated = false;
let vuUserInitialized = false;
let unexpectedLogCount = 0;
let vuCredentials = {
    username: TEST_USER.username,
    password: TEST_USER.password,
};

const thresholdByCheckoutEndpoint = {
    'http_req_duration{endpoint:checkout_mock_pay}': ['p(95)<1000'],
    'http_req_failed{endpoint:checkout_mock_pay}': ['rate==0.00'],
    checkout_unexpected: ['count==0'],
};

export const options = {
    scenarios: {
        // Checkout is often spike-loaded during promotions or flash sales.
        flash_sale: spike,
    },
    thresholds: thresholdByCheckoutEndpoint,
};

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

export default function () {
    if (!isAuthenticated) {
        const loggedIn = group('Authenticate', () => authenticate());
        if (!loggedIn) {
            checkoutUnexpected.add(1);
            sleep(1);
            return;
        }
    }

    const productId = Math.floor(Math.random() * 9) + 1; // Matches data/products.csv range (1-9)

    const cartReady = group('Setup: Add to Cart', () => {
        const addRes = http.post(
            `${app.baseURL}/api/cart/add`,
            JSON.stringify({ productId, quantity: 1 }),
            {
                headers: headers.json,
                tags: { endpoint: 'cart_add' },
            }
        );

        return check(addRes, {
            'cart add successful (200)': (r) => r.status === 200,
        });
    });

    if (!cartReady) {
        checkoutUnexpected.add(1);
        sleep(1);
        return;
    }

    group('Checkout Action', () => {
        const start = Date.now();
        const res = http.post(
            `${app.baseURL}/order/api/mock-pay`,
            JSON.stringify({}),
            {
                headers: headers.json,
                redirects: 0,
                tags: { endpoint: 'checkout_mock_pay' },
                // 400 is expected when stock is depleted in high-concurrency spikes.
                responseCallback: http.expectedStatuses(200, 400),
            }
        );
        checkoutDuration.add(Date.now() - start);

        const handled = check(res, {
            'checkout status is 200 or 400': (r) => r.status === 200 || r.status === 400,
            'checkout has no server error': (r) => r.status < 500,
        });

        if (!handled) {
            if (res.status === 302 || res.status === 401) {
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
