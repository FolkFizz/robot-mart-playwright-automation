import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { app } from '../lib/config.js';
import { smoke } from '../scenarios/index.js';
import { smokeThresholds } from '../thresholds/index.js';

/**
 * =============================================================================
 * SMOKE PERFORMANCE TESTS - System Health Check
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Home Page Availability
 * 2. Product API Basic Availability
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES:
 *   - PERF-SMOKE-01: Home page returns 200 OK
 *   - PERF-SMOKE-02: Product API returns 200 OK with JSON payload
 *   - PERF-SMOKE-03: Response time remains within smoke thresholds
 *
 * Business Rules Tested:
 * ----------------------
 * - Availability: Core entry points must be reachable (Status 200)
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
  thresholds: smokeThresholds
};

export default function () {
  group('Home Page', () => {
    const res = http.get(`${app.baseURL}/`, {
      redirects: 0,
      tags: { endpoint: 'home' }
    });

    check(res, {
      'home status is 200': (r) => r.status === 200,
      'home content type is html': (r) =>
        String(r.headers['Content-Type'] || r.headers['content-type'] || '').includes('text/html')
    });
  });

  group('Product API', () => {
    const res = http.get(`${app.baseURL}/api/products`, {
      redirects: 0,
      tags: { endpoint: 'api_products' }
    });

    let payload = null;
    try {
      payload = res.json();
    } catch (_error) {
      payload = null;
    }

    check(res, {
      'products status is 200': (r) => r.status === 200,
      'products content type is json': (r) =>
        String(r.headers['Content-Type'] || r.headers['content-type'] || '').includes(
          'application/json'
        ),
      'products payload has ok=true': () => Boolean(payload && payload.ok === true),
      'products payload has array': () => Boolean(payload && Array.isArray(payload.products))
    });
  });

  sleep(1);
}
