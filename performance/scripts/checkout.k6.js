import http from 'k6/http';
import { group, sleep } from 'k6';
import { app } from '../lib/config.js';
import { checks } from '../lib/checks.js';
import { spike } from '../scenarios/spike.js';
import { checkoutThresholds } from '../thresholds/checkout.thresholds.js';
import { headers } from '../lib/http.js';

/**
 * =============================================================================
 * CHECKOUT PERFORMANCE TESTS - User Journey: Buyer (Critical Path)
 * =============================================================================
 * 
 * Test Scenarios:
 * ---------------
 * 1. Full Checkout Flow (Mock Payment)
 * 2. High Load / Spike Testing on Payment Gateway
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES:
 *   - PERF-CHECKOUT-01: Complete order placement under load
 * 
 * Business Rules Tested:
 * ----------------------
 * - Transaction Integrity: Orders must be created specifically
 * - Inventory Locking: (Simulated via high load)
 * - Third-party Latency: Handles delays from payment provider
 * 
 * Note: Uses Mock Payment intentionally to avoid calling real Stripe API
 * 
 * =============================================================================
 */

export const options = {
    scenarios: {
        // We use Spike test here because Checkout is often spike-loaded (e.g. Flash Sales)
        flash_sale: spike,
    },
    thresholds: checkoutThresholds,
};

export default function () {
    // 1. Setup Cart
    group('Setup: Add to Cart', () => {
        const payload = JSON.stringify({ productId: 1, quantity: 1 });
        http.post(`${app.baseURL}/api/cart/add`, payload, { headers: headers.json });
    });

    // 2. Checkout
    group('Checkout Action', () => {
        const payload = JSON.stringify({ 
            paymentMethod: 'mock_card',
            address: '123 Test St' 
        });
        const res = http.post(`${app.baseURL}/order/api/create`, payload, { headers: headers.json });
        checks.isSuccess(res);
        sleep(2);
    });
}
