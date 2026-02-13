import { test, expect } from '@fixtures';
import { disableChaos, loginAsAdmin, loginAsUser } from '@api';
import { routes } from '@config';
import { seededProducts } from '@data';
import { hasPotentialStackTrace } from '@utils';
import { createIsolatedUserContext, syncSessionFromApi } from '@test-helpers';
import { createOrderForCurrentSession } from '@test-helpers/helpers/authorization';

/**
 * =============================================================================
 * AUTHORIZATION & ACCESS CONTROL SECURITY TESTS
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Anonymous access control for protected routes
 * 2. Role-based access control (user vs admin)
 * 3. Admin business restrictions (cannot shop)
 * 4. Session invalidation and role transition
 * 5. Cross-user data isolation (invoice ownership)
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (2 tests):
 *   - AUTHZ-P01: admin can access admin dashboard and admin notifications API
 *   - AUTHZ-P02: authenticated user can access own protected resources
 *
 * NEGATIVE CASES (7 tests):
 *   - AUTHZ-N01: anonymous is redirected from notifications API
 *   - AUTHZ-N02: regular user is forbidden from admin notifications API
 *   - AUTHZ-N03: admin dashboard rejects anonymous and regular users
 *   - AUTHZ-N04: admin is blocked from cart add API
 *   - AUTHZ-N05: reset-stock endpoint rejects requests without reset key
 *   - AUTHZ-N06: logout invalidates protected API access
 *   - AUTHZ-N07: anonymous cannot access profile orders page
 *
 * EDGE CASES (3 tests):
 *   - AUTHZ-E01: invoice access is restricted to order owner
 *   - AUTHZ-E02: invalid invoice id returns 404 without stack trace leak
 *   - AUTHZ-E03: role switch in same API context updates authorization
 *
 * Business Rules Tested:
 * ----------------------
 * - Protected User API: /notifications/list requires authenticated session
 * - Admin API and UI: /admin/notifications/list and /admin/dashboard require admin role
 * - Admin Business Guard: admin users cannot add items to cart
 * - Secret Endpoint Guard: /api/products/reset-stock requires X-RESET-KEY
 * - Order Privacy: invoice endpoint is owner-only
 *
 * =============================================================================
 */

test.use({ seedData: true });

test.describe('authorization security @security @authz', () => {
  test.beforeAll(async () => {
    await disableChaos();
  });

  test.describe('positive cases', () => {
    test('AUTHZ-P01: admin can access admin dashboard and admin notifications API @security @authz @smoke', async ({
      api,
      page,
      adminDashboardPage
    }) => {
      await loginAsAdmin(api);
      await syncSessionFromApi(api, page);

      const adminNotificationsRes = await api.get(routes.api.adminNotifications, {
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });
      expect(adminNotificationsRes.status()).toBe(200);
      const adminNotificationsBody = await adminNotificationsRes.json();
      expect(adminNotificationsBody.status).toBe('success');

      await adminDashboardPage.goto();
      expect(page.url()).toContain(routes.admin.dashboard);
    });

    test('AUTHZ-P02: authenticated user can access own protected resources @security @authz @regression', async ({
      api,
      page,
      profilePage
    }) => {
      await loginAsUser(api);
      await syncSessionFromApi(api, page);

      const notificationsRes = await api.get(routes.api.notifications, {
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });
      expect(notificationsRes.status()).toBe(200);
      const notificationsBody = await notificationsRes.json();
      expect(notificationsBody.status).toBe('success');

      await profilePage.gotoTab('orders');
      await expect(page).toHaveURL(
        (url) => `${url.pathname}${url.search}` === routes.profileOrders
      );
    });
  });

  test.describe('negative cases', () => {
    test('AUTHZ-N01: anonymous is redirected from notifications API @security @authz @regression', async ({
      api
    }) => {
      const res = await api.get(routes.api.notifications, { maxRedirects: 0 });

      expect(res.status()).toBe(302);
      expect(res.headers()['location'] ?? '').toContain(routes.login);
    });

    test('AUTHZ-N02: regular user is forbidden from admin notifications API @security @authz @regression', async ({
      api
    }) => {
      await loginAsUser(api);

      const res = await api.get(routes.api.adminNotifications, { maxRedirects: 0 });
      const text = await res.text();

      expect(res.status()).toBe(403);
      expect(text).toContain('Admin Access Only');
    });

    test('AUTHZ-N03: admin dashboard rejects anonymous and regular users @security @authz @regression', async ({
      api
    }) => {
      const anonRes = await api.get(routes.admin.dashboard, { maxRedirects: 0 });
      const anonText = await anonRes.text();
      expect(anonRes.status()).toBe(403);
      expect(anonText).toContain('Admin Access Only');

      await loginAsUser(api);
      const userRes = await api.get(routes.admin.dashboard, { maxRedirects: 0 });
      const userText = await userRes.text();
      expect(userRes.status()).toBe(403);
      expect(userText).toContain('Admin Access Only');
    });

    test('AUTHZ-N04: admin is blocked from cart add API @security @authz @regression', async ({
      api
    }) => {
      await loginAsAdmin(api);

      const res = await api.post(routes.api.cartAdd, {
        data: { productId: seededProducts[0].id, quantity: 1 },
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });

      expect(res.status()).toBe(403);
      const body = await res.json();
      expect(body.status).toBe('error');
      expect(body.message).toContain('Admin cannot shop');
    });

    test('AUTHZ-N05: reset-stock endpoint rejects requests without reset key @security @authz @security @regression', async ({
      api
    }) => {
      const res = await api.post(routes.api.resetStockSafe, { maxRedirects: 0 });

      expect(res.status()).toBe(403);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.status).toBe('forbidden');
      expect(body.message).toContain('Invalid or missing X-RESET-KEY');
    });

    test('AUTHZ-N06: logout invalidates protected API access @security @authz @regression', async ({
      api
    }) => {
      await loginAsUser(api);

      const beforeLogout = await api.get(routes.api.notifications, { maxRedirects: 0 });
      expect(beforeLogout.status()).toBe(200);

      const logoutRes = await api.get(routes.logout, { maxRedirects: 0 });
      expect([302, 303]).toContain(logoutRes.status());

      const afterLogout = await api.get(routes.api.notifications, { maxRedirects: 0 });
      expect(afterLogout.status()).toBe(302);
      expect(afterLogout.headers()['location'] ?? '').toContain(routes.login);
    });

    test('AUTHZ-N07: anonymous cannot access profile orders page @security @authz @regression', async ({
      page,
      profilePage,
      loginPage
    }) => {
      await page.context().clearCookies();
      await profilePage.gotoTab('orders');

      const redirectedToLogin = page.url().includes(routes.login);
      const hasLoginForm = await loginPage.hasAnyLoginInputVisible();
      expect(redirectedToLogin || hasLoginForm).toBe(true);
    });
  });

  test.describe('edge cases', () => {
    test('AUTHZ-E01: invoice access is restricted to order owner @security @authz @regression @destructive', async () => {
      const ownerCtx = await createIsolatedUserContext({ prefix: 'authz', label: 'owner' });
      const otherCtx = await createIsolatedUserContext({ prefix: 'authz', label: 'other' });

      try {
        const orderId = await createOrderForCurrentSession(ownerCtx, [
          { id: seededProducts[0].id, quantity: 1 }
        ]);

        const ownerInvoice = await ownerCtx.get(routes.order.invoice(orderId), { maxRedirects: 0 });
        expect(ownerInvoice.status()).toBe(200);

        const otherInvoice = await otherCtx.get(routes.order.invoice(orderId), { maxRedirects: 0 });
        expect(otherInvoice.status()).toBe(403);
        expect(await otherInvoice.text()).toContain('Unauthorized');
      } finally {
        await ownerCtx.dispose();
        await otherCtx.dispose();
      }
    });

    test('AUTHZ-E02: invalid invoice id returns 404 without stack trace leak @security @authz @regression', async ({
      api
    }) => {
      await loginAsUser(api);

      const res = await api.get(routes.order.invoice('INVALID_ORDER_999'), { maxRedirects: 0 });
      const text = await res.text();

      expect(res.status()).toBe(404);
      expect(/invoice not found|404/i.test(text)).toBe(true);
      expect(hasPotentialStackTrace(text)).toBe(false);
    });

    test('AUTHZ-E03: role switch in same API context updates authorization @security @authz @regression', async ({
      api
    }) => {
      await loginAsUser(api);

      const before = await api.get(routes.api.adminNotifications, { maxRedirects: 0 });
      expect(before.status()).toBe(403);

      await loginAsAdmin(api);

      const after = await api.get(routes.api.adminNotifications, { maxRedirects: 0 });
      expect(after.status()).toBe(200);
      const body = await after.json();
      expect(body.status).toBe('success');
    });
  });
});
