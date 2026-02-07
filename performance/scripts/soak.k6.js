import http from 'k6/http';
import { group, sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { app } from '../lib/config.js';
import { headers } from '../lib/http.js';
import { soak } from '../scenarios/index.js';
import { soakThresholds } from '../thresholds/index.js';

/**
 * =============================================================================
 * SOAK TEST - Long-Duration Stability Testing
 * =============================================================================
 * 
 * Test Scenario:
 * --------------
 * - 10 VUs (constant)
 * - 30 minutes duration (can extend to 1h+ for production)
 * - Full E2E user journey repeated continuously
 * - Moderate load sustained over long period
 * 
 * Expected Behavior:
 * ------------------
 * - NO degradation in response time over duration
 * - NO increase in error rate over time
 * - Memory usage stays stable (no leaks)
 * - Connection pool stays healthy
 * 
 * What We're Looking For:
 * -----------------------
 * - Memory leaks (gradual performance degradation)
 * - Connection pool exhaustion
 * - Database connection leaks
 * - Cache issues (hit rate degradation)
 * - Log file size issues
 * - Any time-based degradation
 * 
 * Business Value:
 * ---------------
 * - Validates system can run 24/7 without restart
 * - Catches issues that only appear over time
 * - Essential for SaaS/production deployments
 * 
 * =============================================================================
 */

// Metrics to track degradation over time
const responseTimeOverTime = new Trend('response_time_over_time');
const errorRateOverTime = new Counter('errors_over_time');
const iterationCount = new Counter('iteration_count');

// Track response time at different intervals
const firstQuarterRT = new Trend('first_quarter_response_time');
const lastQuarterRT = new Trend('last_quarter_response_time');

export const options = {
    scenarios: {
        soak_test: soak,
    },
    thresholds: soakThresholds,
};

export function setup() {
    console.log(`[Setup] Soak Test - Target: ${app.baseURL}`);
    console.log('[Setup] Duration: 30 minutes');
    console.log('[Setup] Testing for: memory leaks, connection issues, degradation');
    console.log('[Setup] ⏰ This will take a while - grab a coffee! ☕');
    return { 
        baseURL: app.baseURL,
        startTime: Date.now()
    };
}

export default function (data) {
    const elapsedMinutes = (Date.now() - data.startTime) / 1000 / 60;
    const testDuration = 30; // minutes
    
    iterationCount.add(1);

    // Full user journey
    let journeySuccess = true;

    // Login
    group('Login', () => {
        const startTime = Date.now();
        const res = http.post(
            `${app.baseURL}/login`,
            { username: 'user', password: 'user123' },
            { headers: headers.form, redirects: 0 }
        );
        
        const duration = Date.now() - startTime;
        responseTimeOverTime.add(duration);
        
        // Track response time by quarter
        if (elapsedMinutes < testDuration / 4) {
            firstQuarterRT.add(duration);
        } else if (elapsedMinutes > (testDuration * 3 / 4)) {
            lastQuarterRT.add(duration);
        }
        
        if (!check(res, { 'login ok': (r) => r.status === 302 || r.status === 200 })) {
            journeySuccess = false;
            errorRateOverTime.add(1);
        }
    });

    sleep(1);

    // Browse
    group('Browse', () => {
        const startTime = Date.now();
        const res = http.get(`${app.baseURL}/products`);
        
        const duration = Date.now() - startTime;
        responseTimeOverTime.add(duration);
        
        if (elapsedMinutes < testDuration / 4) {
            firstQuarterRT.add(duration);
        } else if (elapsedMinutes > (testDuration * 3 / 4)) {
            lastQuarterRT.add(duration);
        }
        
        if (!check(res, { 'browse ok': (r) => r.status === 200 })) {
            journeySuccess = false;
            errorRateOverTime.add(1);
        }
    });

    sleep(2);

    // Add to Cart
    group('Cart', () => {
        const startTime = Date.now();
        const res = http.post(
            `${app.baseURL}/api/cart/add`,
            JSON.stringify({
                productId: Math.floor(Math.random() * 3) + 1,
                quantity: 1
            }),
            { headers: headers.json }
        );
        
        const duration = Date.now() - startTime;
        responseTimeOverTime.add(duration);
        
        if (elapsedMinutes < testDuration / 4) {
            firstQuarterRT.add(duration);
        } else if (elapsedMinutes > (testDuration * 3 / 4)) {
            lastQuarterRT.add(duration);
        }
        
        if (!check(res, { 'cart ok': (r) => r.status === 200 })) {
            journeySuccess = false;
            errorRateOverTime.add(1);
        }
    });

    sleep(2);

    // Checkout
    group('Checkout', () => {
        const startTime = Date.now();
        const res = http.post(
            `${app.baseURL}/order/api/mock-pay`,
            JSON.stringify({}),
            { headers: headers.json }
        );
        
        const duration = Date.now() - startTime;
        responseTimeOverTime.add(duration);
        
        if (elapsedMinutes < testDuration / 4) {
            firstQuarterRT.add(duration);
        } else if (elapsedMinutes > (testDuration * 3 / 4)) {
            lastQuarterRT.add(duration);
        }
        
        if (!check(res, { 'checkout attempted': (r) => r.status === 200 || r.status === 400 })) {
            journeySuccess = false;
            errorRateOverTime.add(1);
        }
    });

    sleep(3);
}

export function teardown(data) {
    console.log('\n========================================');
    console.log('📊 SOAK TEST ANALYSIS');
    console.log('========================================');
    console.log('Test Type: Long-Duration Stability');
    console.log('Duration: 30 minutes');
    console.log('Load: 10 VUs constant');
    console.log('\n🔍 Key Metrics to Review:');
    console.log('   1. Compare first_quarter vs last_quarter response times');
    console.log('      → Should be similar (no degradation)');
    console.log('   2. Error rate should stay consistently low');
    console.log('   3. Memory usage on server should be stable');
    console.log('   4. Database connections should not increase over time');
    console.log('\n⚠️ Red Flags:');
    console.log('   - Response time increases over duration = Memory leak');
    console.log('   - Error rate increases over time = Connection exhaustion');
    console.log('   - Sudden spikes = Resource cleanup issues');
    console.log('========================================\n');
}
