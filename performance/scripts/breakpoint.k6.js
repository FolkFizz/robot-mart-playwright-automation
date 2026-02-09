import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { app } from '../lib/config.js';
import { breakpoint } from '../scenarios/index.js';
import { breakpointThresholds } from '../thresholds/index.js';

/**
 * =============================================================================
 * BREAKPOINT TEST - Maximum Throughput Discovery
 * =============================================================================
 *
 * Goal:
 * - Discover maximum sustainable requests/second before quality degrades.
 *
 * Method:
 * - Use ramping-arrival-rate scenario (10 -> 300 req/s over 4 minutes).
 * - Hit a lightweight representative endpoint: GET /api/products.
 * - Track success/failure split and response-time degradation by load.
 *
 * Notes:
 * - No explicit sleep is used; arrival-rate executor controls pacing.
 * - Non-200 responses are counted as failures for capacity analysis.
 * =============================================================================
 */

const totalRequests = new Counter('total_requests');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');
const responseTimeByRate = new Trend('response_time_by_rate');

export const options = {
    scenarios: {
        breakpoint_test: breakpoint,
    },
    thresholds: breakpointThresholds,
};

export function setup() {
    console.log(`[Setup] Breakpoint Test - target=${app.baseURL}`);
    console.log('[Setup] Arrival profile: 10 -> 50 -> 100 -> 200 -> 300 req/s');
    console.log('[Setup] Endpoint: GET /api/products');
}

export default function () {
    totalRequests.add(1);

    const startTime = Date.now();
    const res = http.get(`${app.baseURL}/api/products`, {
        redirects: 0,
        tags: { endpoint: 'api_products' },
        responseCallback: http.expectedStatuses(200),
    });
    const duration = Date.now() - startTime;

    responseTimeByRate.add(duration);

    const contentType = String(res.headers['Content-Type'] || res.headers['content-type'] || '');

    const success = check(res, {
        'status is 200': (r) => r.status === 200,
        'response time < 5s': (r) => r.timings.duration < 5000,
        'returns JSON payload': () => contentType.includes('application/json'),
    });

    if (success) {
        successfulRequests.add(1);
    } else {
        failedRequests.add(1);
    }
}

export function teardown() {
    console.log('\n========================================');
    console.log('BREAKPOINT TEST - ANALYSIS GUIDE');
    console.log('========================================');
    console.log('1) Locate where http_req_failed starts rising sharply.');
    console.log('2) Locate where response_time_by_rate / p95 becomes unacceptable.');
    console.log('3) Capacity limit is the lower of those two points.');
    console.log('4) Plan steady-state traffic at ~60-70% of that limit.');
    console.log('========================================\n');
}
