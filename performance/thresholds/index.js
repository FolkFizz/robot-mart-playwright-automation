/**
 * =============================================================================
 * THRESHOLDS - k6 Performance Acceptance Criteria
 * =============================================================================
 * 
 * Pre-configured threshold definitions for different test types.
 * Import the thresholds you need:
 * 
 *   import { smokeThresholds, browseThresholds, cartThresholds, 
 *            checkoutThresholds, raceThresholds } from './thresholds/index.js';
 * 
 * =============================================================================
 */

/**
 * Smoke Test Thresholds
 * - 95th percentile response time < 500ms
 * - Error rate < 1%
 */
export const smokeThresholds = {
    http_req_duration: ['p(95)<500'], // 95% of requests should be < 500ms
    http_req_failed: ['rate<0.01'],   // 99% success rate
};

/**
 * Browse/Product Listing Thresholds
 * - 95th percentile response time < 500ms (fast reads expected)
 * - Error rate < 1%
 */
export const browseThresholds = {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
};

/**
 * Cart Operations Thresholds
 * - 95th percentile response time < 800ms (write operations, slightly slower)
 * - Error rate < 1%
 */
export const cartThresholds = {
    http_req_duration: ['p(95)<800'], // Cart operations might be slightly slower (writes)
    http_req_failed: ['rate<0.01'],
};

/**
 * Checkout Thresholds
 * - 95th percentile response time < 1000ms (involves 3rd party mock payment)
 * - ZERO error tolerance (checkout is critical path)
 */
export const checkoutThresholds = {
    http_req_duration: ['p(95)<1000'], // Checkout involves 3rd party calls (stripe mock)
    http_req_failed: ['rate==0.00'],    // ZERO tolerance for errors in checkout
};

/**
 * Race Condition Test Thresholds
 * - 95th percentile response time < 5000ms (DB locks may cause delays)
 * - Error rate < 95% (most requests will "fail" with 400 out of stock - expected!)
 * 
 * Note: High "failure" rate is EXPECTED in race tests because only N requests
 * should succeed where N = available stock.
 */
export const raceThresholds = {
    http_req_duration: ['p(95)<5000'],  // Allow up to 5s (DB locks may cause delays)
    http_req_failed: ['rate<0.95'],     // Most requests will "fail" (400 out of stock) - that's expected!
};
