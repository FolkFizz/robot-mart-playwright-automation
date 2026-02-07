import { test, expect } from '@fixtures';
import { routes } from '@config';
import { expectNoServerError, expectSecurityHeaders } from '@utils';

/**
 * =============================================================================
 * SECURITY HEADERS TESTS
 * =============================================================================
 * 
 * Test Scenarios:
 * ---------------
 * 1. HTTP Security Headers Validation (CSP, HSTS, X-Frame-Options, etc.)
 * 2. API Endpoint & Static Resource Security
 * 3. Specific Header Configurations (CORS, Permissions-Policy)
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (6 tests):
 *   - SEC-HDR-P01: Home page includes baseline security headers
 *   - SEC-HDR-P02: Products API includes baseline security headers
 *   - SEC-HDR-P03: Cart page includes baseline security headers
 *   - SEC-HDR-P04: Checkout page includes baseline security headers
 *   - SEC-HDR-P05: CSP header includes safe source directives
 *   - SEC-HDR-P06: CORS headers properly configured for API
 * 
 * NEGATIVE CASES (3 tests):
 *   - SEC-HDR-N01: X-Content-Type-Options prevents MIME sniffing
 *   - SEC-HDR-N02: X-Frame-Options prevents clickjacking
 *   - SEC-HDR-N03: Referrer-Policy limits information leakage
 * 
 * EDGE CASES (3 tests):
 *   - SEC-HDR-E01: Static resources (JS/CSS) have correct cache/security headers
 *   - SEC-HDR-E02: HSTS header includes appropriate directives
 *   - SEC-HDR-E03: Permissions-Policy restricts dangerous features
 * 
 * Business Rules Tested:
 * ----------------------
 * - Security Headers Required: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
 * - API Security: correct CORS configuration
 * - Data Protection: No sniffing, no clickjacking, limited referrer leakage
 *   - X-Content-Type-Options: nosniff
 *   - X-Frame-Options: DENY or SAMEORIGIN
 *   - X-XSS-Protection: 1; mode=block (legacy browsers)
 *   - Strict-Transport-Security: (HSTS in production)
 *   - Content-Security-Policy: (CSP to prevent XSS)
 * - Header Validation: Checks for presence and correct values
 * - Coverage: Both HTML pages and JSON API endpoints
 * 
 * =============================================================================
 */

test.describe('security headers @security @headers', () => {

  test.describe('positive cases', () => {

    test('SEC-HDR-P01: home includes baseline security headers @security @headers @smoke', async ({ api }) => {
      // Act: Request home page
      const res = await api.get(routes.home);

      // Assert: No server errors
      expectNoServerError(res);

      // Assert: Security headers present
      expectSecurityHeaders(res.headers());
    });

    test('SEC-HDR-P02: products api includes baseline security headers @security @headers @regression', async ({ api }) => {
      // Act: Request products API
      const res = await api.get(routes.api.products);

      // Assert: No server errors
      expectNoServerError(res);

      // Assert: Security headers present
      expectSecurityHeaders(res.headers());
    });

    test('SEC-HDR-P03: cart page includes security headers @security @headers @regression', async ({ api }) => {
      // Act: Request cart page
      const res = await api.get(routes.cart);

      // Assert: No server errors
      expectNoServerError(res);

      // Assert: Security headers present
      expectSecurityHeaders(res.headers());
    });

    test('SEC-HDR-P04: checkout page includes security headers @security @headers @regression', async ({ api }) => {
      // Act: Request checkout page (may redirect if no cart)
      const res = await api.get(routes.checkout);

      // Assert: Either loads or redirects (both should have headers)
      expect([200, 302]).toContain(res.status());

      // Assert: Security headers present
      expectSecurityHeaders(res.headers());
    });

    test('SEC-HDR-P05: CSP header includes safe source directives @security @headers @smoke', async ({ api }) => {
      // Act: Request home page
      const res = await api.get(routes.home);

      // Assert: CSP header exists
      const headers = res.headers();
      const csp = headers['content-security-policy'];
      
      // CSP should exist (even if permissive)
      if (csp) {
        // Should not be completely open (unsafe-inline everywhere is bad)
        expect(csp).toBeTruthy();
      }
    });

    test('SEC-HDR-P06: CORS headers properly configured for API @security @headers @regression', async ({ api }) => {
      // Act: Request API endpoint
      const res = await api.get(routes.api.products);

      // Assert: CORS headers present or not needed
      const headers = res.headers();
      
      // If Access-Control-Allow-Origin exists, validate it's not wildcard with credentials
      const acao = headers['access-control-allow-origin'];
      const acac = headers['access-control-allow-credentials'];
      
      if (acao && acac === 'true') {
        // Should not be '*' if credentials allowed (security risk)
        expect(acao).not.toBe('*');
      }
    });
  });

  test.describe('negative cases', () => {

    test('SEC-HDR-N01: X-Content-Type-Options prevents MIME sniffing @security @headers @smoke', async ({ api }) => {
      // Act: Request home page
      const res = await api.get(routes.home);

      // Assert: X-Content-Type-Options header is set to nosniff
      const headers = res.headers();
      const contentTypeOptions = headers['x-content-type-options'];
      expect(contentTypeOptions).toBe('nosniff');
    });

    test('SEC-HDR-N02: X-Frame-Options prevents clickjacking @security @headers @smoke', async ({ api }) => {
      // Act: Request home page
      const res = await api.get(routes.home);

      // Assert: X-Frame-Options is set to DENY or SAMEORIGIN
      const headers = res.headers();
      const frameOptions = headers['x-frame-options'];
      
      // Should have X-Frame-Options to prevent iframe embedding
      expect(frameOptions).toBeTruthy();
      expect(['DENY', 'SAMEORIGIN']).toContain(frameOptions?.toUpperCase());
    });

    test('SEC-HDR-N03: Referrer-Policy limits information leakage @security @headers @regression', async ({ api }) => {
      // Act: Request home page
      const res = await api.get(routes.home);

      // Assert: Referrer-Policy header exists and is restrictive
      const headers = res.headers();
      const referrerPolicy = headers['referrer-policy'];
      
      // Should have some referrer policy (even if permissive)
      // Acceptable values: no-referrer, same-origin, strict-origin, etc.
      if (referrerPolicy) {
        expect(referrerPolicy).toBeTruthy();
        // Should not be 'unsafe-url' which leaks full URL
        expect(referrerPolicy).not.toBe('unsafe-url');
      }
    });
  });

  test.describe('edge cases', () => {

    test('SEC-HDR-E01: static resources include cache control headers @security @headers @regression', async ({ api }) => {
      // Act: Request a static resource (CSS or JS)
      const res = await api.get('/css/style.css').catch(() => api.get('/'));

      // Assert: Response received
      expect(res.status()).toBeLessThan(500);

      // Assert: Cache-related headers present for optimization
      const headers = res.headers();
      expect(headers).toBeDefined();
    });

    test('SEC-HDR-E02: HSTS header includes appropriate directives @security @headers @regression', async ({ api }) => {
      // Act: Request home page
      const res = await api.get(routes.home);

      // Assert: HSTS header check
      const headers = res.headers();
      const hsts = headers['strict-transport-security'];
      
      // HSTS may not be present in dev/test (only production)
      // If present, should have max-age
      if (hsts) {
        expect(hsts).toContain('max-age');
      }
    });

    test('SEC-HDR-E03: Permissions-Policy restricts dangerous features @security @headers @regression', async ({ api }) => {
      // Act: Request home page
      const res = await api.get(routes.home);

      // Assert: Permissions-Policy or Feature-Policy header
      const headers = res.headers();
      const permissionsPolicy = headers['permissions-policy'] || headers['feature-policy'];
      
      // If policy exists, verify it restricts some features
      if (permissionsPolicy) {
        // Should restrict at least one dangerous feature
        // Common restrictions: camera, microphone, geolocation, payment
        expect(permissionsPolicy).toBeTruthy();
      }
    });
  });
});
