import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { app } from '../lib/config.js';
import { smoke } from '../scenarios/index.js';
import { smokeThresholds } from '../thresholds/index.js';

/**
 * Overview: Fast smoke performance probe for core availability of home and products API endpoints.
 * Summary: Acts as preflight validation before heavier workloads by checking status, payload shape, and basic latency thresholds.
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

