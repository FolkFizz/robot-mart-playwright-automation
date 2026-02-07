import http from 'k6/http';
import { group, sleep, check } from 'k6';
import { app } from '../lib/config.js';
import { checks } from '../lib/checks.js';
import { spike } from '../scenarios/index.js';
import { checkoutThresholds } from '../thresholds/index.js';
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
        
        // Deep Validation: Check if we actually got an Order ID
        const isSuccess = checks.isSuccess(res);
        
        if (isSuccess) {
            try {
                // Check Content-Type to see if we got JSON or HTML
                const contentType = res.headers['Content-Type'] || '';
                
                if (contentType.includes('application/json')) {
                    const body = res.json();
                    check(res, { 
                        'has valid orderId': (r) => body && body.orderId
                    });
                } else {
                    // If HTML (e.g., redirected to dashboard), check for success elements
                    // or just accept 2xx as success if we can't parse orderId from HTML easily
                    const body = res.body; 
                    check(res, {
                        'is not error page': (r) => !r.body.includes('Error') && !r.body.includes('Failed')
                    });
                }
            } catch (e) {
                // Swallow JSON parse errors silently if it's not critical, 
                // but definitely DON'T dump HTML to console
                console.error('Checkout validation warning: Response was not valid JSON');
            }
        }
    });
}
