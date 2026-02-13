import { test, expect } from '@fixtures';
import { loginAsUser } from '@api';
import { routes } from '@config';
import {
  malformedInvoiceIds,
  maliciousLoginPayloads
} from '@test-helpers/constants/security';
import { hasPotentialStackTrace } from '@utils';

/**
 * =============================================================================
 * INPUT HARDENING SECURITY TESTS
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Authentication bypass payload resistance
 * 2. Path traversal and malformed identifier handling
 * 3. Query tampering against admin endpoints
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (1 test):
 *   - SEC-INP-P01: valid login still works after failed malicious attempts
 *
 * NEGATIVE CASES (3 tests):
 *   - SEC-INP-N01: SQL/XSS-like login payloads are rejected
 *   - SEC-INP-N02: admin endpoint query tampering does not bypass role checks
 *   - SEC-INP-N03: anonymous query tampering does not bypass protected API auth
 *
 * EDGE CASES (1 test):
 *   - SEC-INP-E01: malformed invoice ids return controlled 4xx without stack leaks
 *
 * Business Rules Tested:
 * ----------------------
 * - Login endpoint must not authenticate malformed credentials
 * - Admin endpoints must enforce role checks regardless of query parameters
 * - Invoice endpoint must reject malformed ids safely without internal leaks
 *
 * =============================================================================
 */

test.use({ seedData: true });

test.describe('input hardening security @security @hardening', () => {
  test.describe('positive cases', () => {
    test('SEC-INP-P01: valid login still works after failed malicious attempts @security @hardening @smoke', async ({
      api
    }) => {
      await api.get(routes.logout, { maxRedirects: 0 }).catch(() => undefined);

      for (const payload of maliciousLoginPayloads) {
        const badRes = await api.post(routes.login, {
          form: { username: payload, password: payload },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          maxRedirects: 0
        });
        expect(badRes.status()).toBe(200);
      }

      await loginAsUser(api);
      const notificationsRes = await api.get(routes.api.notifications, { maxRedirects: 0 });
      expect(notificationsRes.status()).toBe(200);
      const body = await notificationsRes.json();
      expect(body.status).toBe('success');
    });
  });

  test.describe('negative cases', () => {
    test('SEC-INP-N01: SQL/XSS-like login payloads are rejected @security @hardening @regression', async ({
      api
    }) => {
      await api.get(routes.logout, { maxRedirects: 0 }).catch(() => undefined);

      for (const payload of maliciousLoginPayloads) {
        const res = await api.post(routes.login, {
          form: { username: payload, password: payload },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          maxRedirects: 0
        });

        expect(res.status()).toBe(200);
        const bodyText = (await res.text()).toLowerCase();
        expect(bodyText).toContain('invalid username or password');

        const protectedRes = await api.get(routes.api.notifications, { maxRedirects: 0 });
        expect(protectedRes.status()).toBe(302);
        expect(protectedRes.headers()['location'] ?? '').toContain(routes.login);
      }
    });

    test('SEC-INP-N02: admin endpoint query tampering does not bypass role checks @security @hardening @regression', async ({
      api
    }) => {
      await loginAsUser(api);

      const res = await api.get(`${routes.api.adminNotifications}?role=admin%27--&debug=true`, {
        maxRedirects: 0
      });
      const text = await res.text();

      expect(res.status()).toBe(403);
      expect(text).toContain('Admin Access Only');
    });

    test('SEC-INP-N03: anonymous query tampering does not bypass protected API auth @security @hardening @regression', async ({
      api
    }) => {
      const res = await api.get(`${routes.api.notifications}?user_id=1&isAdmin=true`, {
        maxRedirects: 0
      });

      expect(res.status()).toBe(302);
      expect(res.headers()['location'] ?? '').toContain(routes.login);
    });
  });

  test.describe('edge cases', () => {
    test('SEC-INP-E01: malformed invoice ids return controlled 4xx without stack leaks @security @hardening @regression', async ({
      api
    }) => {
      await loginAsUser(api);

      for (const id of malformedInvoiceIds) {
        const res = await api.get(`${routes.order.invoiceBase}/${id}`, { maxRedirects: 0 });
        const text = await res.text();

        expect(res.status()).toBeGreaterThanOrEqual(400);
        expect(res.status()).toBeLessThan(500);
        expect(hasPotentialStackTrace(text)).toBe(false);
      }
    });
  });
});
