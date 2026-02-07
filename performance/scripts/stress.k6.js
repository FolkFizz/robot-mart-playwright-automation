import http from 'k6/http';
import { group, sleep, check } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { app } from '../lib/config.js';
import { headers } from '../lib/http.js';
import { stress } from '../scenarios/index.js';
import { stressThresholds } from '../thresholds/index.js';

/**
 * =============================================================================
 * STRESS TEST - Finding the System Breaking Point
 * =============================================================================
 * 
 * Test Scenario:
 * --------------
 * - Gradually ramp from 0 to 150 VUs over 9 minutes
 * - Stage 1: 0 → 50 VUs (2 min)
 * - Stage 2: 50 → 100 VUs (3 min)
 * - Stage 3: 100 → 150 VUs (2 min)
 * - Stage 4: Recovery 150 → 0 (2 min)
 * 
 * Expected Behavior:
 * ------------------
 * - System degrades gracefully under increasing load
 * - Identify the point where errors spike
 * - Identify the point where response times become unacceptable
 * 
 * Business Value:
 * ---------------
 * - Determines system capacity limits
 * - Helps with capacity planning
 * - Validates auto-scaling triggers
 * - Identifies which components fail first
 * 
 * =============================================================================
 */

// Custom metrics to track degradation
const performanceScore = new Trend('performance_score'); // Response time in ms
const errorsByStage = new Counter('errors_by_stage');

export const options = {
    scenarios: {
        stress_test: stress,
    },
    thresholds: stressThresholds,
};

export function setup() {
    console.log(`[Setup] Stress Test - Target: ${app.baseURL}`);
    console.log('[Setup] Ramping load to find breaking point...');
    console.log('[Setup] Watch for: performance degradation, error spikes, timeouts');
    return { baseURL: app.baseURL };
}

export default function (data) {
    const currentVUs = __VU;
    
    // Mix of different operations to stress different parts of the system
    const operations = [
        () => browseProducts(),
        () => addToCart(),
        () => checkout(),
    ];

    // Randomly select operation (weighted)
    const rand = Math.random();
    if (rand < 0.5) {
        browseProducts();
    } else if (rand < 0.8) {
        addToCart();
    } else {
        checkout();
    }

    sleep(0.5); // Shorter sleep to increase request rate
}

function browseProducts() {
    group('Browse', () => {
        const startTime = Date.now();
        const res = http.get(`${app.baseURL}/products`);
        const duration = Date.now() - startTime;
        
        performanceScore.add(duration);
        
        const success = check(res, {
            'browse successful': (r) => r.status === 200,
        });
        
        if (!success) {
            errorsByStage.add(1);
        }
    });
}

function addToCart() {
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
        
        performanceScore.add(duration);
        
        const success = check(res, {
            'cart add successful': (r) => r.status === 200,
        });
        
        if (!success) {
            errorsByStage.add(1);
        }
    });
}

function checkout() {
    group('Checkout', () => {
        const startTime = Date.now();
        const res = http.post(
            `${app.baseURL}/order/api/mock-pay`,
            JSON.stringify({}),
            { headers: headers.json }
        );
        const duration = Date.now() - startTime;
        
        performanceScore.add(duration);
        
        const success = check(res, {
            'checkout attempted': (r) => r.status === 200 || r.status === 400,
        });
        
        if (!success) {
            errorsByStage.add(1);
        }
    });
}

export function teardown(data) {
    console.log('\n========================================');
    console.log('📊 STRESS TEST ANALYSIS');
    console.log('========================================');
    console.log('Test Type: Breaking Point Discovery');
    console.log('Max Load: 150 VUs');
    console.log('\n🔍 Analysis Points:');
    console.log('   1. At what VU count did errors start?');
    console.log('   2. At what VU count did response time degrade?');
    console.log('   3. Did the system recover gracefully?');
    console.log('   4. Which endpoints failed first?');
    console.log('\n💡 Next Steps:');
    console.log('   - Review error_rate trend in results');
    console.log('   - Check performance_score degradation');
    console.log('   - Set auto-scaling threshold before breaking point');
    console.log('========================================\n');
}
