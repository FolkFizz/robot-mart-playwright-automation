/**
 * =============================================================================
 * SCENARIOS - k6 Load Testing Configurations
 * =============================================================================
 *
 * Pre-configured scenario definitions for different test types.
 * Import the scenarios you need:
 *
 *   import {
 *       smoke, concurrent, constant, ramping, spike,
 *       load, loadStrict, stress, soak, breakpoint
 *   } from './scenarios/index.js';
 *
 * =============================================================================
 */

/**
 * Smoke Test - Basic Functionality Check
 * - 1 VU (Virtual User)
 * - 60 seconds duration
 * - Useful for validating connectivity before heavier tests
 */
export const smoke = {
  executor: 'constant-vus',
  vus: 1,
  duration: '60s',
  gracefulStop: '0s'
};

/**
 * Concurrent Test - Race Condition Testing
 * - 20 VUs simultaneously
 * - 20 shared iterations
 * - All users hit endpoint at roughly the same time
 */
export const concurrent = {
  executor: 'shared-iterations',
  vus: 20,
  iterations: 20,
  maxDuration: '30s'
};

/**
 * Constant Load Test - Sustained Traffic
 * - 10 VUs constant
 * - 1 minute duration
 */
export const constant = {
  executor: 'constant-vus',
  vus: 10,
  duration: '1m',
  gracefulStop: '30s'
};

/**
 * Ramping Test - Gradual Load Increase
 * - Starts at 0 VUs
 * - Ramps up to 5 VUs over 30s
 * - Holds at 5 VUs for 1 minute
 * - Ramps down to 0 over 30s
 */
export const ramping = {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 5 },
    { duration: '30s', target: 0 }
  ],
  gracefulRampDown: '30s'
};

/**
 * Spike Test - Sudden Traffic Burst
 * - Warm-up at 0 VUs
 * - Rapid jump to 20 VUs
 * - Hold spike for 1 minute
 * - Ramp down to 0
 */
export const spike = {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [
    { duration: '10s', target: 0 },
    { duration: '10s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '10s', target: 0 }
  ],
  gracefulRampDown: '30s'
};

/**
 * Load Test - Quick Baseline Profile
 * - 10 VUs constant
 * - 30 seconds duration
 * - Useful for fast local validation
 */
export const load = {
  executor: 'constant-vus',
  vus: 10,
  duration: '30s',
  gracefulStop: '10s'
};

/**
 * Strict Staged Load Test - Realistic Ramp Profile
 * - Ramp up: 0 -> 20 VUs (30s)
 * - Sustain: 20 VUs (1m)
 * - Ramp down: 20 -> 0 VUs (30s)
 */
export const loadStrict = {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 0 }
  ],
  gracefulRampDown: '10s'
};

/**
 * Stress Test - Breaking Point Discovery
 * - Gradually increases load from 0 to 150 VUs
 * - Total profile length: 9 minutes
 */
export const stress = {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [
    { duration: '2m', target: 50 },
    { duration: '3m', target: 100 },
    { duration: '2m', target: 150 },
    { duration: '2m', target: 0 }
  ],
  gracefulRampDown: '30s'
};

/**
 * Soak Test - Long Duration Stability
 * - 10 VUs constant
 * - 30 minutes duration
 */
export const soak = {
  executor: 'constant-vus',
  vus: 10,
  duration: '30m',
  gracefulStop: '30s'
};

/**
 * Breakpoint Test - Maximum Throughput Discovery
 * - Arrival-rate based profile
 * - Increases from 10 to 300 requests/second
 */
export const breakpoint = {
  executor: 'ramping-arrival-rate',
  startRate: 10,
  timeUnit: '1s',
  preAllocatedVUs: 50,
  maxVUs: 200,
  stages: [
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '1m', target: 200 },
    { duration: '1m', target: 300 }
  ]
};
