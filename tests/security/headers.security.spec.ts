import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '@fixtures';
import { env, routes } from '@config';
import { expectNoServerError, expectSecurityHeaders } from '@utils';

/**
 * =============================================================================
 * SECURITY HEADERS TESTS
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Response hardening checks for key pages and APIs
 * 2. Security header validation with environment-aware strictness
 * 3. Defensive checks for not-found/error responses
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (6 tests):
 *   - SEC-HDR-P01: key routes return non-5xx responses
 *   - SEC-HDR-P02: key APIs return non-5xx responses
 *   - SEC-HDR-P03: production target includes baseline security headers
 *   - SEC-HDR-P04: CORS credentials are not paired with wildcard origin
 *   - SEC-HDR-P05: CSP directives avoid obviously dangerous patterns
 *   - SEC-HDR-P06: HSTS contains max-age when present
 *
 * NEGATIVE CASES (3 tests):
 *   - SEC-HDR-N01: x-content-type-options is strict when present
 *   - SEC-HDR-N02: x-frame-options blocks framing when present
 *   - SEC-HDR-N03: referrer-policy avoids unsafe-url when present
 *
 * EDGE CASES (3 tests):
 *   - SEC-HDR-E01: not-found responses do not leak stack traces
 *   - SEC-HDR-E02: header values are non-empty when provided
 *   - SEC-HDR-E03: permissions-policy is restrictive when present
 *
 * Business Rules Tested:
 * ----------------------
 * - Deployment-aware strictness: local dev may miss proxy headers; production must enforce baseline headers
 * - Header safety: when present, values must be secure and non-ambiguous
 * - Error hardening: failed routes should not expose internals
 *
 * =============================================================================
 */

type HeaderMap = Record<string, string>;

const getHostname = (baseUrl: string): string => {
  try {
    return new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return 'localhost';
  }
};

const isLocalTarget = (): boolean => {
  const hostname = getHostname(env.baseUrl);
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
};

const isPotentialStackTrace = (text: string): boolean => {
  return /(referenceerror|typeerror|syntaxerror|node_modules|\bat\s+\S+\s*\()/i.test(text);
};

const getHeaders = async (api: APIRequestContext, path: string): Promise<HeaderMap> => {
  const res = await api.get(path, { maxRedirects: 0 });
  expectNoServerError(res);
  return res.headers();
};

test.describe('security headers @security @headers', () => {
  test.describe('positive cases', () => {
    test('SEC-HDR-P01: key routes return non-5xx responses @security @headers @smoke', async ({ api }) => {
      const pages = [routes.home, routes.cart, routes.checkout, `${routes.profile}?tab=orders`];

      for (const path of pages) {
        const res = await api.get(path, { maxRedirects: 0 });
        expectNoServerError(res);
      }
    });

    test('SEC-HDR-P02: key APIs return non-5xx responses @security @headers @regression', async ({ api }) => {
      const apis = [routes.api.products, routes.api.notifications, routes.api.adminNotifications];

      for (const path of apis) {
        const res = await api.get(path, { maxRedirects: 0, headers: { Accept: 'application/json' } });
        expectNoServerError(res);
      }
    });

    test('SEC-HDR-P03: production target includes baseline security headers @security @headers @smoke', async ({ api }) => {
      test.skip(isLocalTarget(), 'Strict header presence is enforced in production/staging targets, not local dev server.');

      const headers = await getHeaders(api, routes.home);
      expectSecurityHeaders(headers);
    });

    test('SEC-HDR-P04: CORS credentials are not paired with wildcard origin @security @headers @regression', async ({ api }) => {
      const headers = await getHeaders(api, routes.api.products);
      const acao = headers['access-control-allow-origin'];
      const acac = headers['access-control-allow-credentials'];

      if (acac?.toLowerCase() === 'true') {
        expect(acao).toBeTruthy();
        expect(acao).not.toBe('*');
      }
    });

    test('SEC-HDR-P05: CSP directives avoid obviously dangerous patterns @security @headers @regression', async ({ api }) => {
      const headers = await getHeaders(api, routes.home);
      const csp = headers['content-security-policy'];
      if (!csp) return;

      const normalized = csp.toLowerCase();
      expect(normalized.includes('default-src *')).toBe(false);
      expect(normalized.includes("script-src *")).toBe(false);
      expect(normalized.includes("'unsafe-eval'")).toBe(false);
    });

    test('SEC-HDR-P06: HSTS contains max-age when present @security @headers @regression', async ({ api }) => {
      const headers = await getHeaders(api, routes.home);
      const hsts = headers['strict-transport-security'];
      if (!hsts) return;

      expect(/max-age=\d+/i.test(hsts)).toBe(true);
    });
  });

  test.describe('negative cases', () => {
    test('SEC-HDR-N01: x-content-type-options is strict when present @security @headers @smoke', async ({ api }) => {
      const headers = await getHeaders(api, routes.home);
      const value = headers['x-content-type-options'];
      if (!value) return;

      expect(value.toLowerCase()).toBe('nosniff');
    });

    test('SEC-HDR-N02: x-frame-options blocks framing when present @security @headers @smoke', async ({ api }) => {
      const headers = await getHeaders(api, routes.home);
      const value = headers['x-frame-options'];
      if (!value) return;

      expect(['deny', 'sameorigin']).toContain(value.toLowerCase());
    });

    test('SEC-HDR-N03: referrer-policy avoids unsafe-url when present @security @headers @regression', async ({ api }) => {
      const headers = await getHeaders(api, routes.home);
      const value = headers['referrer-policy'];
      if (!value) return;

      expect(value.toLowerCase()).not.toBe('unsafe-url');
    });
  });

  test.describe('edge cases', () => {
    test('SEC-HDR-E01: not-found responses do not leak stack traces @security @headers @regression', async ({ api }) => {
      const res = await api.get('/__missing_security_probe__', { maxRedirects: 0 });
      expect(res.status()).toBe(404);

      const body = await res.text();
      expect(isPotentialStackTrace(body)).toBe(false);
    });

    test('SEC-HDR-E02: header values are non-empty when provided @security @headers @regression', async ({ api }) => {
      const headers = await getHeaders(api, routes.home);
      const interesting = [
        'content-security-policy',
        'x-content-type-options',
        'x-frame-options',
        'referrer-policy',
        'strict-transport-security',
        'permissions-policy'
      ];

      interesting.forEach((key) => {
        const value = headers[key];
        if (value !== undefined) {
          expect(value.trim().length).toBeGreaterThan(0);
        }
      });
    });

    test('SEC-HDR-E03: permissions-policy is restrictive when present @security @headers @regression', async ({ api }) => {
      const headers = await getHeaders(api, routes.home);
      const policy = headers['permissions-policy'] || headers['feature-policy'];
      if (!policy) return;

      const normalized = policy.toLowerCase();
      const hasRestriction = /(camera|microphone|geolocation|payment)\s*=\s*\(\s*\)/.test(normalized);
      expect(hasRestriction).toBe(true);
    });
  });
});
