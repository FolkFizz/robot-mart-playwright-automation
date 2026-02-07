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

/**
 * Load Test - Realistic Sustained Traffic
 * - 20 VUs constant
 * - 5 minutes duration
 * - Simulates expected production load
 * - Tests system behavior under normal sustained usage
 */
export const load = {
    executor: 'constant-vus',
    vus: 10,
    duration: '30s',
    gracefulStop: '10s',
};

/**
 * Strict Staged Load Test - Realistic Ramp Profile
 * - Ramp up: 0 → 20 VUs (30s)
 * - Sustained: 20 VUs (1m)
 * - Ramp down: 20 → 0 VUs (30s)
 * - Total: 2 minutes
 * - More realistic than constant VUs
 * - Designed for strict 200-only validation
 */
export const loadStrict = {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '10s',
};

/**
 * Stress Test - Finding the Breaking Point
 * - Gradually increases load from 0 to 150 VUs
 * - 4 stages over 9 minutes
 * - Identifies system limits and degradation points
 * - Helps determine when performance degrades and system fails
 */
export const stress = {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
        { duration: '2m', target: 50 },   // Ramp to moderate load
        { duration: '3m', target: 100 },  // Push to high load
        { duration: '2m', target: 150 },  // Beyond expected capacity
        { duration: '2m', target: 0 },    // Recovery
    ],
    gracefulRampDown: '30s',
};

/**
 * Soak Test - Long-Duration Stability
 * - 10 VUs constant
 * - 30 minutes duration (extend to 1h+ for production)
 * - Tests for memory leaks, connection pool issues, degradation over time
 * - Verifies system remains stable under sustained moderate load
 */
export const soak = {
    executor: 'constant-vus',
    vus: 10,
    duration: '30m', // Can be increased to 1h or more for thorough testing
    gracefulStop: '30s',
};

/**
 * Breakpoint Test - Maximum Throughput Discovery
 * - Arrival-rate based (requests per second)
 * - Gradually increases from 10 to 300 req/s
 * - Discovers maximum sustainable throughput
 * - Helps with capacity planning and infrastructure sizing
 */
export const breakpoint = {
    executor: 'ramping-arrival-rate',
    startRate: 10,
    timeUnit: '1s',
    preAllocatedVUs: 50,
    maxVUs: 200,
    stages: [
        { duration: '1m', target: 50 },   // 50 req/s
        { duration: '1m', target: 100 },  // 100 req/s
        { duration: '1m', target: 200 },  // 200 req/s
        { duration: '1m', target: 300 },  // 300 req/s - likely to break
    ],
    gracefulRampDown: '30s',
};
