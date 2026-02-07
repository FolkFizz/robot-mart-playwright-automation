import http from 'k6/http';
import { sleep } from 'k6';
import { app } from '../lib/config.js';
import { smoke } from '../scenarios/index.js';
import { checks } from '../lib/checks.js';
import { smokeThresholds } from '../thresholds/index.js';

/**
 * =============================================================================
 * SMOKE PERFORMANCE TESTS - System Health Check
 * =============================================================================
 * 
 * Test Scenarios:
 * ---------------
 * 1. Basic Connectivity Check
 * 2. Home Page Availability
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES:
 *   - PERF-SMOKE-01: System responds to HTTP requests
 *   - PERF-SMOKE-02: Home page returns 200 OK
 *   - PERF-SMOKE-03: Response time is within acceptable limits (warm-up check)
 * 
 * Business Rules Tested:
 * ----------------------
 * - Availability: System must be reachable (Status 200)
 * - Latency: Quick response required for basic health check
 * - Stability: No failures allowed during smoke test
 * 
 * Note: This test is designed to run FAST. If this fails, do not proceed
 * to larger load tests (Browse/Cart/Checkout).
 * 
 * =============================================================================
 */

export const options = {
    scenarios: { smoke },
    thresholds: smokeThresholds,
};

export default function () {
    const res = http.get(`${app.baseURL}/`);
    
    // Use shared checks for consistency
    checks.is200(res);
    
    sleep(1);
}
