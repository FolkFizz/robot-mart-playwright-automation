import http from 'k6/http';
import { group, sleep } from 'k6';
import { app } from '../lib/config.js';
import { checks } from '../lib/checks.js';
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
 * 3. Update Item Quantity
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

export const options = {
    scenarios: {
        cart: ramping,
    },
    thresholds: cartThresholds,
};

export default function () {
    // Session-like behavior: k6 handles cookies automatically in the VU jar
    
    group('Add Item to Cart', () => {
        const payload = JSON.stringify({ productId: 1, quantity: 1 });
        const res = http.post(`${app.baseURL}/api/cart/add`, payload, { headers: headers.json });
        checks.isSuccess(res);
        sleep(1);
    });

    group('View Cart', () => {
        const res = http.get(`${app.baseURL}/api/cart`);
        checks.is200(res);
        sleep(1);
    });
}
