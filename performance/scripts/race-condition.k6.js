import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { app } from '../lib/config.js';
import { headers } from '../lib/http.js';
import { concurrent } from '../scenarios/concurrent.js';
import { raceThresholds } from '../thresholds/race.thresholds.js';

/**
 * =============================================================================
 * RACE CONDITION TESTS - Inventory Overselling Prevention
 * =============================================================================
 * 
 * Test Scenario:
 * --------------
 * - 20 VUs (Virtual Users) login as the SAME user
 * - Each VU adds a product to cart then attempts checkout SIMULTANEOUSLY
 * - Backend uses Atomic UPDATE to prevent overselling:
 *   `UPDATE products SET stock = stock - $1 WHERE stock >= $1`
 * 
 * Expected Behavior:
 * ------------------
 * - MAXIMUM N successes where N = initial stock
 * - Remaining requests get 400 (Stock limit reached)
 * - NO inventory oversold (stock should never go negative)
 * 
 * Target Endpoint:
 * ----------------
 * POST /order/api/mock-pay (has race condition protection)
 * 
 * =============================================================================
 */

// Custom metrics
const successfulPurchases = new Counter('successful_purchases');
const failedPurchases = new Counter('failed_purchases');
const checkoutDuration = new Trend('checkout_duration');

// Test configuration
const TEST_USER = {
    username: 'user',
    password: 'user123'
};

const TARGET_PRODUCT = {
    id: 1,      // Product to race for
    quantity: 1
};

export const options = {
    scenarios: {
        race_checkout: concurrent,
    },
    thresholds: raceThresholds,
};

// Setup: Each VU runs this once before the main test
export function setup() {
    console.log(`[Setup] Race Condition Test - Target: ${app.baseURL}`);
    console.log(`[Setup] Testing concurrent checkout for Product ID: ${TARGET_PRODUCT.id}`);
    return { baseURL: app.baseURL };
}

export default function (data) {
    // Create a unique jar for session management
    const jar = http.cookieJar();
    
    group('🔐 Authenticate', () => {
        const loginRes = http.post(
            `${app.baseURL}/login`,
            {
                username: TEST_USER.username,
                password: TEST_USER.password
            },
            {
                headers: headers.form,
                redirects: 0  // Don't follow redirects to check status
            }
        );
        
        check(loginRes, {
            'login successful (302)': (r) => r.status === 302 || r.status === 200,
        });
    });
    
    group('🛒 Add to Cart', () => {
        const addRes = http.post(
            `${app.baseURL}/api/cart/add`,
            JSON.stringify({
                productId: TARGET_PRODUCT.id,
                quantity: TARGET_PRODUCT.quantity
            }),
            { headers: headers.json }
        );
        
        check(addRes, {
            'add to cart succeeded': (r) => r.status === 200,
        });
    });
    
    // Small delay to ensure all VUs reach checkout at roughly the same time
    sleep(0.1);
    
    group('💳 Race: Concurrent Checkout', () => {
        const startTime = Date.now();
        
        const checkoutRes = http.post(
            `${app.baseURL}/order/api/mock-pay`,
            JSON.stringify({}),
            { headers: headers.json }
        );
        
        const duration = Date.now() - startTime;
        checkoutDuration.add(duration);
        
        // Check if purchase succeeded (200) or was rejected (400)
        const isSuccess = checkoutRes.status === 200;
        const isRejected = checkoutRes.status === 400;
        
        check(checkoutRes, {
            'checkout completed (200 success)': (r) => r.status === 200,
            'checkout rejected (400 out of stock)': (r) => r.status === 400,
            'no server error (5xx)': (r) => r.status < 500,
        });
        
        // Track outcomes
        if (isSuccess) {
            successfulPurchases.add(1);
            console.log(`✅ VU ${__VU}: Purchase SUCCESS - Order created`);
        } else if (isRejected) {
            failedPurchases.add(1);
            // Expected behavior - stock was depleted
        } else {
            console.warn(`⚠️ VU ${__VU}: Unexpected status ${checkoutRes.status}`);
            console.warn(`   Response: ${checkoutRes.body.substring(0, 200)}`);
        }
    });
}

export function teardown(data) {
    console.log(`\n========================================`);
    console.log(`📊 RACE CONDITION TEST ANALYSIS`);
    console.log(`========================================`);
    console.log(`Target Endpoint: POST /order/api/mock-pay`);
    console.log(`\n🎯 PASS Criteria:`);
    console.log(`   - successful_purchases ≤ initial stock`);
    console.log(`   - No 5xx errors (server stability)`);
    console.log(`   - failed_purchases shows 400 rejections`);
    console.log(`\n❌ FAIL Indicators:`);
    console.log(`   - successful_purchases > initial stock → OVERSOLD!`);
    console.log(`   - Many 5xx errors → Server crashed`);
    console.log(`========================================\n`);
}
