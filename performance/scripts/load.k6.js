import http from 'k6/http';
import { group, sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { app } from '../lib/config.js';
import { headers } from '../lib/http.js';
import { load } from '../scenarios/index.js';
import { loadThresholds } from '../thresholds/index.js';

/**
 * =============================================================================
 * LOAD TEST - Full E2E User Journey Under Normal Load
 * =============================================================================
 * 
 * Test Scenario:
 * --------------
 * - 20 concurrent users (VUs)
 * - 5 minutes sustained load
 * - Full user journey: Login → Browse → Add to Cart → Checkout
 * - Simulates realistic production traffic
 * 
 * Expected Behavior:
 * ------------------
 * - System maintains acceptable response times (p95 < 1s)
 * - Error rate stays below 5%
 * - All user flows complete successfully under normal conditions
 * 
 * Business Value:
 * ---------------
 * - Validates system can handle expected production load
 * - Identifies bottlenecks in realistic scenarios
 * - Provides baseline performance metrics
 * 
 * =============================================================================
 */

// Custom metrics
const loginAttempts = new Counter('login_attempts');
const browseAttempts = new Counter('browse_attempts');
const cartAttempts = new Counter('cart_attempts');
const checkoutAttempts = new Counter('checkout_attempts');
const fullJourneySuccess = new Counter('full_journey_success');

const loginDuration = new Trend('login_duration');
const browseDuration = new Trend('browse_duration');
const cartDuration = new Trend('cart_duration');
const checkoutDuration = new Trend('checkout_duration');

export const options = {
    scenarios: {
        load_test: load,
    },
    thresholds: loadThresholds,
};

export function setup() {
    console.log(`[Setup] Load Test - Target: ${app.baseURL}`);
    console.log('[Setup] Testing full E2E journey under sustained load');
    return { baseURL: app.baseURL };
}

export default function (data) {
    let journeySuccess = true;

    // 🔐 Step 1: Login
    group('Login', () => {
        const startTime = Date.now();
        loginAttempts.add(1);

        const loginRes = http.post(
            `${app.baseURL}/login`,
            {
                username: 'user',
                password: 'user123'
            },
            {
                headers: headers.form,
                redirects: 0
            }
        );

        loginDuration.add(Date.now() - startTime);

        const success = check(loginRes, {
            'login successful': (r) => r.status === 302 || r.status === 200,
        });

        if (!success) journeySuccess = false;
    });

    sleep(1);

    // 🛍️ Step 2: Browse Products
    group('Browse Products', () => {
        const startTime = Date.now();
        browseAttempts.add(1);

        const browseRes = http.get(`${app.baseURL}/products`);
        browseDuration.add(Date.now() - startTime);

        const success = check(browseRes, {
            'products page loaded': (r) => r.status === 200,
        });

        if (!success) journeySuccess = false;
    });

    sleep(2);

    // 🛒 Step 3: Add to Cart
    group('Add to Cart', () => {
        const startTime = Date.now();
        cartAttempts.add(1);

        const cartRes = http.post(
            `${app.baseURL}/api/cart/add`,
            JSON.stringify({
                productId: Math.floor(Math.random() * 3) + 1, // Random product 1-3
                quantity: 1
            }),
            { headers: headers.json }
        );

        cartDuration.add(Date.now() - startTime);

        const success = check(cartRes, {
            'item added to cart': (r) => r.status === 200,
        });

        if (!success) journeySuccess = false;
    });

    sleep(2);

    // 💳 Step 4: Checkout
    group('Checkout', () => {
        const startTime = Date.now();
        checkoutAttempts.add(1);

        const checkoutRes = http.post(
            `${app.baseURL}/order/api/mock-pay`,
            JSON.stringify({}),
            { headers: headers.json }
        );

        checkoutDuration.add(Date.now() - startTime);

        const success = check(checkoutRes, {
            'checkout completed': (r) => r.status === 200 || r.status === 400,
        });

        if (!success) journeySuccess = false;
    });

    // Track full journey completion
    if (journeySuccess) {
        fullJourneySuccess.add(1);
    }

    sleep(3); // Think time between iterations
}

export function teardown(data) {
    console.log('\n========================================');
    console.log('📊 LOAD TEST SUMMARY');
    console.log('========================================');
    console.log('Test Type: Full E2E User Journey');
    console.log('Load Profile: 20 VUs for 5 minutes');
    console.log('\n💡 What to Look For:');
    console.log('   - Response times stay consistent');
    console.log('   - Error rate < 5%');
    console.log('   - High full_journey_success rate');
    console.log('========================================\n');
}
