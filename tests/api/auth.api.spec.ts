import { test, expect } from '@fixtures';
import type { APIRequestContext } from '@playwright/test';
import { loginAsAdmin, loginAsUser } from '@api';
import { routes } from '@config';
import { authInputs, authErrors } from '@data';

/**
 * =============================================================================
 * AUTHENTICATION API TESTS - Comprehensive Coverage
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. User Login API (Session Cookie Management)
 * 2. Admin Login API (Elevated privileges)
 * 3. Login Failure Handling (Invalid Credentials)
 * 4. Session Persistence & Validation
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (4 tests):
 *   - AUTH-API-P01: user login creates authenticated session
 *   - AUTH-API-P02: admin login creates authenticated session
 *   - AUTH-API-P03: authenticated user session persists across requests
 *   - AUTH-API-P04: session cookie includes expected security attributes
 *
 * NEGATIVE CASES (3 tests):
 *   - AUTH-API-N01: invalid credentials return error
 *   - AUTH-API-N02: empty credentials are rejected and remain unauthenticated
 *   - AUTH-API-N03: regular user session cannot access admin endpoint
 *
 * EDGE CASES (2 tests):
 *   - AUTH-API-E01: re-authentication switches role in same session context
 *   - AUTH-API-E02: repeated failed logins recover with later valid login
 *
 * Business Rules Tested:
 * ----------------------
 * - Authentication Method: Session-based with HTTP-only cookies
 * - Login Endpoint: POST /login (form-urlencoded)
 * - Success Response: 200/redirect and session persisted in request context
 * - Failure Response: 200 OK with error message in HTML (legacy behavior)
 * - Session Cookie: HttpOnly, Secure (in production), SameSite attribute present
 *
 * =============================================================================
 */

test.use({ seedData: true });

test.describe('authentication api @api @auth', () => {
  const getSessionCookie = async (api: APIRequestContext) => {
    const state = await api.storageState();
    return state.cookies.find((cookie) => cookie.name === 'connect.sid');
  };

  test.describe('positive cases', () => {
    test('AUTH-API-P01: user login creates authenticated session @api @auth @smoke', async ({
      api
    }) => {
      // Act: Login as regular user
      await loginAsUser(api);

      // Assert: Session cookie exists in API request context
      const sessionCookie = await getSessionCookie(api);
      expect(sessionCookie).toBeTruthy();

      // Assert: Authenticated user can access user notifications API
      const notificationsRes = await api.get(routes.api.notifications);
      expect(notificationsRes.status()).toBe(200);
      const notificationsBody = await notificationsRes.json();
      expect(notificationsBody.status).toBe('success');
    });

    test('AUTH-API-P02: admin login creates authenticated session @api @auth @regression', async ({
      api
    }) => {
      // Act: Login as admin user
      await loginAsAdmin(api);

      // Assert: Session cookie exists in API request context
      const sessionCookie = await getSessionCookie(api);
      expect(sessionCookie).toBeTruthy();

      // Assert: Authenticated admin can access admin notifications API
      const adminNotificationsRes = await api.get(routes.api.adminNotifications);
      expect(adminNotificationsRes.status()).toBe(200);
      const adminNotificationsBody = await adminNotificationsRes.json();
      expect(adminNotificationsBody.status).toBe('success');
    });

    test('AUTH-API-P03: authenticated user session persists across requests @api @auth @regression', async ({
      api
    }) => {
      // Arrange: Login as regular user
      await loginAsUser(api);

      // Act & Assert: Protected endpoint remains accessible across sequential calls
      for (let i = 0; i < 2; i += 1) {
        const notificationsRes = await api.get(routes.api.notifications);
        expect(notificationsRes.status()).toBe(200);
        const notificationsBody = await notificationsRes.json();
        expect(notificationsBody.status).toBe('success');
        expect(typeof notificationsBody.unreadCount).toBe('number');
      }
    });

    test('AUTH-API-P04: session cookie includes expected security attributes @api @auth @regression', async ({
      api
    }) => {
      // Arrange: Login as user
      await loginAsUser(api);

      // Assert: Cookie carries expected security metadata
      const sessionCookie = await getSessionCookie(api);
      expect(sessionCookie).toBeTruthy();
      expect(sessionCookie?.httpOnly).toBe(true);
      expect(typeof sessionCookie?.secure).toBe('boolean');
      expect(['Lax', 'Strict', 'None']).toContain(sessionCookie?.sameSite ?? '');
      expect(sessionCookie?.path).toBe('/');
    });
  });

  test.describe('negative cases', () => {
    test('AUTH-API-N01: invalid credentials return error @api @auth @regression', async ({
      api
    }) => {
      // Act: Attempt login with wrong credentials
      const res = await api.post(routes.login, {
        form: {
          username: authInputs.wrongUsername,
          password: authInputs.wrongPassword
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      // Assert: Error content in response
      expect(res.status()).toBe(200); // Legacy: returns 200 with error HTML
      const body = await res.text();
      expect(body).toContain(authErrors.invalidCredentials);

      // Assert: Invalid login session is not authenticated
      const notificationsRes = await api.get(routes.api.notifications, { maxRedirects: 0 });
      expect(notificationsRes.status()).toBe(302);
      expect(notificationsRes.headers()['location']).toContain(routes.login);
    });

    test('AUTH-API-N02: empty credentials are rejected and remain unauthenticated @api @auth @regression', async ({
      api
    }) => {
      // Act: Attempt login with empty credentials
      const res = await api.post(routes.login, {
        form: {
          username: '',
          password: ''
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      // Assert: Legacy error response
      expect(res.status()).toBe(200);
      const body = await res.text();
      expect(body).toContain(authErrors.invalidCredentials);

      // Assert: Still unauthenticated
      const notificationsRes = await api.get(routes.api.notifications, { maxRedirects: 0 });
      expect(notificationsRes.status()).toBe(302);
      expect(notificationsRes.headers()['location']).toContain(routes.login);
    });

    test('AUTH-API-N03: regular user session cannot access admin endpoint @api @auth @security @regression', async ({
      api
    }) => {
      // Arrange: Login as regular user
      await loginAsUser(api);

      // Act: Access admin-only endpoint
      const adminRes = await api.get(routes.api.adminNotifications, { maxRedirects: 0 });
      const text = await adminRes.text();

      // Assert: Forbidden
      expect(adminRes.status()).toBe(403);
      expect(text).toContain('Admin Access Only');
    });
  });

  test.describe('edge cases', () => {
    test('AUTH-API-E01: re-authentication switches role in same session context @api @auth @regression', async ({
      api
    }) => {
      // Arrange: Start as regular user
      await loginAsUser(api);
      const adminBefore = await api.get(routes.api.adminNotifications, { maxRedirects: 0 });
      expect(adminBefore.status()).toBe(403);

      // Act: Re-authenticate as admin in the same API context
      await loginAsAdmin(api);

      // Assert: Admin endpoint is now accessible
      const adminAfter = await api.get(routes.api.adminNotifications, { maxRedirects: 0 });
      expect(adminAfter.status()).toBe(200);
      const adminBody = await adminAfter.json();
      expect(adminBody.status).toBe('success');
    });

    test('AUTH-API-E02: repeated failed logins recover with later valid login @api @auth @regression', async ({
      api
    }) => {
      // Arrange & Act: Multiple failed login attempts
      for (let i = 0; i < 3; i += 1) {
        const badRes = await api.post(routes.login, {
          form: {
            username: `${authInputs.wrongUsername}_${i}`,
            password: authInputs.wrongPassword
          },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        expect(badRes.status()).toBe(200);
        const badBody = await badRes.text();
        expect(badBody).toContain(authErrors.invalidCredentials);
      }

      // Assert: Not authenticated after failed attempts
      const notificationsBefore = await api.get(routes.api.notifications, { maxRedirects: 0 });
      expect(notificationsBefore.status()).toBe(302);
      expect(notificationsBefore.headers()['location']).toContain(routes.login);

      // Act: Valid login still works
      await loginAsUser(api);

      // Assert: Session is now authenticated
      const notificationsAfter = await api.get(routes.api.notifications, { maxRedirects: 0 });
      expect(notificationsAfter.status()).toBe(200);
      const notificationsBody = await notificationsAfter.json();
      expect(notificationsBody.status).toBe('success');
    });
  });
});
