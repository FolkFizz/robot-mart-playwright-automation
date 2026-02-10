import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { app } from '../lib/config.js';
import { ramping } from '../scenarios/index.js';
import { browseThresholds } from '../thresholds/index.js';
import { toPositiveInt, createProductPool } from '../lib/perf-helpers.js';

/**
 * =============================================================================
 * BROWSE PERFORMANCE TESTS - User Journey: Visitor
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Visit Home Page
 * 2. Browse Product Catalog API
 * 3. View Product Details (simulating user interest)
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES:
 *   - PERF-BROWSE-01: Home page loads within threshold
 *   - PERF-BROWSE-02: Product listing API returns 200 JSON
 *   - PERF-BROWSE-03: Product details API returns 200 JSON
 *
 * Business Rules Tested:
 * ----------------------
 * - Response Time: 95% of requests must be under 500ms
 * - Availability: Error rate must be under 1%
 *
 * =============================================================================
 */

export const options = {
  scenarios: {
    browse: ramping
  },
  thresholds: browseThresholds
};

const PRODUCT_MIN = toPositiveInt(__ENV.PERF_PRODUCT_MIN, 1);
const PRODUCT_MAX = Math.max(PRODUCT_MIN, toPositiveInt(__ENV.PERF_PRODUCT_MAX, 9));

const productPool = createProductPool({
  sharedArrayName: 'browse_product_ids_from_csv',
  productMin: PRODUCT_MIN,
  productMax: PRODUCT_MAX
});

export default function () {
  group('Visit Home Page', () => {
    const res = http.get(`${app.baseURL}/`, {
      redirects: 0,
      tags: { endpoint: 'home' }
    });

    check(res, {
      'home status is 200': (r) => r.status === 200,
      'home has html content': (r) =>
        String(r.headers['Content-Type'] || r.headers['content-type'] || '').includes('text/html')
    });
  });

  group('Browse Product Catalog', () => {
    const res = http.get(`${app.baseURL}/api/products`, {
      redirects: 0,
      tags: { endpoint: 'api_products' }
    });

    const contentType = String(res.headers['Content-Type'] || res.headers['content-type'] || '');
    let payload = null;
    try {
      payload = res.json();
    } catch (_error) {
      payload = null;
    }

    check(res, {
      'catalog status is 200': (r) => r.status === 200,
      'catalog returns json': () => contentType.includes('application/json'),
      'catalog payload has ok=true': () => Boolean(payload && payload.ok === true),
      'catalog payload has products array': () =>
        Boolean(payload && Array.isArray(payload.products))
    });
  });

  group('View Product Details', () => {
    const productId = productPool.pickProductId();
    const res = http.get(`${app.baseURL}/api/products/${productId}`, {
      redirects: 0,
      tags: { endpoint: 'api_product_detail' }
    });

    const contentType = String(res.headers['Content-Type'] || res.headers['content-type'] || '');
    let payload = null;
    let detailId = null;
    try {
      payload = res.json();
      detailId = Number(payload && payload.product && payload.product.id);
    } catch (_error) {
      payload = null;
      detailId = null;
    }

    check(res, {
      'detail status is 200': (r) => r.status === 200,
      'detail returns json': () => contentType.includes('application/json'),
      'detail payload has ok=true': () => Boolean(payload && payload.ok === true),
      'detail payload contains product.id': () => Number.isInteger(detailId) && detailId > 0
    });
  });

  sleep(1.5);
}
