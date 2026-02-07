import http from 'k6/http';
import { group, sleep, check } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { app } from '../lib/config.js';
import { headers } from '../lib/http.js';
import { breakpoint } from '../scenarios/index.js';
import { breakpointThresholds } from '../thresholds/index.js';

/**
 * =============================================================================
 * BREAKPOINT TEST - Maximum Throughput Discovery
 * =============================================================================
 * 
 * Test Scenario:
 * --------------
 * - Uses arrival rate (requests/second) instead of VUs
 * - Ramps from 10 req/s to 300 req/s over 4 minutes
 * - Allocates VUs dynamically as needed (up to 200)
 * - Finds the maximum sustainable throughput
 * 
 * Stages:
 * -------
 * - 1 min: 10 → 50 req/s
 * - 1 min: 50 → 100 req/s
 * - 1 min: 100 → 200 req/s
 * - 1 min: 200 → 300 req/s (likely breaks here)
 * 
 * Expected Behavior:
 * ------------------
 * - System handles low rates perfectly
 * - At some point, error rate spikes
 * - At some point, response time becomes unacceptable
 * - The point just before break = Maximum capacity
 * 
 * Business Value:
 * ---------------
 * - Determines maximum requests/second capacity
 * - Critical for capacity planning
 * - Helps set auto-scaling thresholds
 * - Validates infrastructure sizing
 * 
 * =============================================================================
 */

// Metrics to track capacity
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');
const requestsPerSecond = new Rate('requests_per_second');
const responseTimeByRate = new Trend('response_time_by_rate');

export const options = {
    scenarios: {
        breakpoint_test: breakpoint,
    },
    thresholds: breakpointThresholds,
};

export function setup() {
    console.log(`[Setup] Breakpoint Test - Target: ${app.baseURL}`);
    console.log('[Setup] Finding maximum throughput...');
    console.log('[Setup] Starting at 10 req/s, ramping to 300 req/s');
    console.log('[Setup] 🎯 Goal: Find the breaking point');
    return { baseURL: app.baseURL };
}

export default function (data) {
    // Lightweight single-endpoint test to maximize throughput
    // Using GET /products as it's a common, representative endpoint
    
    const startTime = Date.now();
    
    const res = http.get(`${app.baseURL}/products`);
    
    const duration = Date.now() - startTime;
    responseTimeByRate.add(duration);
    requestsPerSecond.add(1);
    
    const success = check(res, {
        'status is 200': (r) => r.status === 200,
        'response time < 5s': (r) => r.timings.duration < 5000,
    });
    
    if (success) {
        successfulRequests.add(1);
    } else {
        failedRequests.add(1);
    }
    
    // Minimal sleep - we want max throughput
    sleep(0.1);
}

export function teardown(data) {
    console.log('\n========================================');
    console.log('📊 BREAKPOINT TEST ANALYSIS');
    console.log('========================================');
    console.log('Test Type: Maximum Throughput Discovery');
    console.log('Rate Range: 10 → 300 req/s');
    console.log('\n🔍 How to Analyze Results:');
    console.log('   1. Find the rate where error_rate spikes above 5%');
    console.log('   2. Find the rate where p95 response time > 1s');
    console.log('   3. The LOWER of these two = Your maximum capacity');
    console.log('\n💡 Example Analysis:');
    console.log('   - If errors spike at 150 req/s');
    console.log('   - And p95 stays good until 180 req/s');
    console.log('   - Then max capacity = 150 req/s');
    console.log('\n📈 Capacity Planning:');
    console.log('   - Set normal load target: 60-70% of max');
    console.log('   - Set auto-scaling trigger: 80% of max');
    console.log('   - Reserve headroom for traffic spikes');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Review http_req_failed rate over time');
    console.log('   2. Review http_req_duration percentiles');
    console.log('   3. Plot successful_requests vs failed_requests');
    console.log('   4. Document your findings for capacity planning');
    console.log('========================================\n');
}
