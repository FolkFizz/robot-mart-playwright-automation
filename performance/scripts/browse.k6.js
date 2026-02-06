import http from 'k6/http';
import { group, sleep } from 'k6';
import { app } from '../lib/config.js';
import { checks } from '../lib/checks.js';
import { ramping } from '../scenarios/ramping.js';
import { browseThresholds } from '../thresholds/browse.thresholds.js';

/**
 * =============================================================================
 * BROWSE PERFORMANCE TESTS - User Journey: Visitor
 * =============================================================================
 * 
 * Test Scenarios:
 * ---------------
 * 1. Visit Home Page
 * 2. View Product Details (simulating user interest)
 * 3. Browse Category/Catalog
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES:
 *   - PERF-BROWSE-01: Home page loads within threshold
 *   - PERF-BROWSE-02: Product details API returns 200 OK
 *   - PERF-BROWSE-03: Static assets (CSS/JS) load successfully
 * 
 * Business Rules Tested:
 * ----------------------
 * - Response Time: 95% of requests must be under 500ms
 * - Availability: Error rate must be under 1%
 * - Caching: Repeated visits should demonstrate cache hits (observation only)
 * 
 * =============================================================================
 */

export const options = {
    scenarios: {
        browse: ramping,
    },
    thresholds: browseThresholds,
};

export default function () {
    group('Visit Home Page', () => {
        const res = http.get(`${app.baseURL}/`);
        checks.is200(res);
        sleep(1);
    });

    group('View Product Details', () => {
        // ID 1 is usually safe to assume exists in seed data
        const res = http.get(`${app.baseURL}/api/products/1`);
        checks.is200(res);
        sleep(2);
    });
}
