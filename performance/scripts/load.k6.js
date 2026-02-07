import http from 'k6/http';
import { group, sleep, check } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { app } from '../lib/config.js';
import { headers } from '../lib/http.js';

/**
 * CONFIGURABLE LOAD TEST
 * 
 * Modes (set via TEST_MODE env var):
 * - balanced (default): Realistic thresholds, stages-based
 * - acceptance: No thresholds, always pass, measurement only
 * 
 * Usage:
 *   npm run test:perf:load              # balanced mode
 *   npm run test:perf:load-acceptance   # acceptance mode
 */

// ========== CONFIGURATION ==========
const TEST_MODE = __ENV.TEST_MODE || 'balanced';

// ========== CUSTOM METRICS ==========
const loginAttempts = new Counter('login_attempts');
const browseAttempts = new Counter('browse_attempts');
const cartAttempts = new Counter('cart_attempts');
const checkoutAttempts = new Counter('checkout_attempts');
const fullJourneySuccess = new Counter('full_journey_success');

const loginDuration = new Trend('login_duration');
const browseDuration = new Trend('browse_duration');
const cartDuration = new Trend('cart_duration');
const checkoutDuration = new Trend('checkout_duration');

// ========== TEST OPTIONS ==========
const baseOptions = {
    stages: [
        { duration: '30s', target: 20 },  // Ramp up
        { duration: '1m', target: 20 },   // Sustained
        { duration: '30s', target: 0 },   // Ramp down
    ],
};

const thresholds = {
    balanced: {
        'http_req_failed': ['rate<0.10'],
        'http_req_duration': ['p(95)<1500', 'p(99)<3000'],
        'login_duration': ['p(95)<800'],
        'browse_duration': ['p(95)<1000'],
        'cart_duration': ['p(95)<500'],
        'checkout_duration': ['p(95)<800'],
    },
    acceptance: {},  // No thresholds = always pass
};

export const options = {
    ...baseOptions,
    thresholds: thresholds[TEST_MODE],
    tags: { test_mode: TEST_MODE },
};

// ========== SETUP ==========
export function setup() {
    console.log(`\n🚀 Load Test - Mode: ${TEST_MODE.toUpperCase()}`);
    console.log(`Target: ${app.baseURL}`);
    console.log(`Profile: 0→20→20→0 VUs (2 min)\n`);
    return { baseURL: app.baseURL };
}

// ========== TEST SCENARIO ==========
export default function (data) {
    let journeySuccess = true;

    // Login
    group('Login', () => {
        const start = Date.now();
        loginAttempts.add(1);

        const res = http.post(`${app.baseURL}/login`,
            { username: 'user', password: 'user123' },
            { headers: headers.form, redirects: 0 }
        );

        loginDuration.add(Date.now() - start);
        
        if (!check(res, { 'login ok': (r) => r.status === 200 || r.status === 302 })) {
            journeySuccess = false;
            return; // Exit if login fails
        }
    });

    sleep(1 + Math.random());

    // Browse
    group('Browse', () => {
        const start = Date.now();
        browseAttempts.add(1);

        const res = http.get(`${app.baseURL}/`);
        browseDuration.add(Date.now() - start);

        if (!check(res, { 'browse ok': (r) => r.status === 200 })) {
            journeySuccess = false;
        }
    });

    sleep(2 + Math.random() * 2);

    // Add to Cart
    group('Cart', () => {
        const start = Date.now();
        cartAttempts.add(1);

        // Random product from ALL products (1-205) instead of just 1-10
        // This distributes load evenly across entire catalog
        const productId = Math.floor(Math.random() * 205) + 1;

        const res = http.post(`${app.baseURL}/api/cart/add`,
            JSON.stringify({ 
                productId, 
                quantity: 1 
            }),
            { headers: headers.json }
        );

        cartDuration.add(Date.now() - start);

        if (!check(res, { 'cart ok': (r) => r.status === 200 })) {
            journeySuccess = false;
        }
    });

    sleep(1 + Math.random());

    // Checkout
    group('Checkout', () => {
        const start = Date.now();
        checkoutAttempts.add(1);

        const res = http.post(`${app.baseURL}/order/api/mock-pay`,
            JSON.stringify({}),
            { 
                headers: headers.json,
                // Tell k6 that 400 is an EXPECTED response (not an error)
                // This prevents 400 from being counted in http_req_failed
                responseCallback: http.expectedStatuses(200, 400)
            }
        );

        checkoutDuration.add(Date.now() - start);

        // Accept both 200 (success) and 400 (stock out/insufficient funds)
        if (!check(res, { 'checkout attempted': (r) => r.status === 200 || r.status === 400 })) {
            journeySuccess = false;
        }
    });

    if (journeySuccess) fullJourneySuccess.add(1);
    
    sleep(2);
}

// ========== TEARDOWN ==========
export function teardown(data) {
    console.log(`\n✅ Load Test Complete - Mode: ${TEST_MODE.toUpperCase()}\n`);
}
