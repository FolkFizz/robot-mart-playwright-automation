/**
 * =============================================================================
 * SCENARIOS - k6 Load Testing Configurations
 * =============================================================================
 * 
 * Pre-configured scenario definitions for different types of performance tests.
 * Import the scenarios you need:
 * 
 *   import { smoke, concurrent, constant, ramping, spike } from './scenarios/index.js';
 * 
 * =============================================================================
 */

/**
 * Smoke Test - Basic Functionality Check
 * - 1 VU (Virtual User)
 * - 60 seconds duration
 * - Perfect for validating endpoints work before running heavier tests
 */
export const smoke = {
    executor: 'constant-vus',
    vus: 1, // Single User
    duration: '60s', // Increased to handle cold starts
    gracefulStop: '0s',
};

/**
 * Concurrent Test - Race Condition Testing
 * - 20 VUs simultaneously
 * - 20 shared iterations
 * - All users hit endpoint at roughly the same time
 * - Perfect for testing race conditions and atomic operations
 */
export const concurrent = {
    executor: 'shared-iterations',
    vus: 20,           // 20 users simultaneously
    iterations: 20,    // 20 total attempts
    maxDuration: '30s',
};

/**
 * Constant Load Test - Sustained Traffic
 * - 10 VUs constant
 * - 1 minute duration
 * - Tests system behavior under steady load
 */
export const constant = {
    executor: 'constant-vus',
    vus: 10,
    duration: '1m',
    gracefulStop: '30s',
};

/**
 * Ramping Test - Gradual Load Increase
 * - Starts at 0 VUs
 * - Ramps up to 5 VUs over 30s
 * - Holds at 5 VUs for 1 minute
 * - Ramps down to 0 over 30s
 * - Tests system behavior under increasing/decreasing load
 */
export const ramping = {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
        { duration: '30s', target: 5 },  // Ramp up to 5 users
        { duration: '1m', target: 5 },   // Stay at 5 users
        { duration: '30s', target: 0 },  // Ramp down
    ],
    gracefulRampDown: '30s',
};

/**
 * Spike Test - Sudden Traffic Burst
 * - Warm up period (10s at 0 VUs)
 * - Sudden spike to 20 VUs in 10s
 * - Hold spike for 1 minute
 * - Recovery period (10s to 0 VUs)
 * - Tests system resilience to sudden traffic spikes
 */
export const spike = {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
        { duration: '10s', target: 0 },  // Warm up
        { duration: '10s', target: 20 }, // SPIKE! 20 users instantly
        { duration: '1m', target: 20 },  // Hold spike
        { duration: '10s', target: 0 },  // Recovery
    ],
    gracefulRampDown: '30s',
};
