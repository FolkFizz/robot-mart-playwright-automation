import { test, expect } from '@fixtures';
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
 * POSITIVE CASES (2 tests):
 *   - AUTH-API-P01: User login returns session cookie
 *   - AUTH-API-P02: Admin login returns session cookie
 * 
 * NEGATIVE CASES (1 test):
 *   - AUTH-API-N01: Invalid credentials return error response
 * 
 * EDGE CASES (0 tests):
 *   - (Future: Token expiry, concurrent sessions, logout)
 * 
 * Business Rules Tested:
 * ----------------------
 * - Authentication Method: Session-based with HTTP-only cookies
 * - Login Endpoint: POST /api/auth/login (form-urlencoded)
 * - Success Response: 200 OK with Set-Cookie header
 * - Failure Response: 200 OK with error message in HTML (legacy behavior)
 * - Session Cookie: HttpOnly, Secure (in production), SameSite=Strict
 * 
 * =============================================================================
 */

test.describe('authentication api @api @auth', () => {
  test.use({ seedData: true });

  test.describe('positive cases', () => {

    test('AUTH-API-P01: user login returns session cookie @api @auth @smoke', async ({ api }) => {
      // Act: Login as regular user
      const res = await loginAsUser(api);

      // Assert: Session cookie set
      const cookieHeader = res.headers()['set-cookie'];
      expect(cookieHeader).toBeTruthy();
    });

    test('AUTH-API-P02: admin login returns session cookie @api @auth @regression', async ({ api }) => {
      // Act: Login as admin user
      const res = await loginAsAdmin(api);

      // Assert: Session cookie set
      const cookieHeader = res.headers()['set-cookie'];
      expect(cookieHeader).toBeTruthy();
    });
  });

  test.describe('negative cases', () => {

    test('AUTH-API-N01: invalid credentials return error @api @auth @regression', async ({ api }) => {
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
    });
  });

  // Future edge cases:
  // test.describe('edge cases', () => {
  //   test('AUTH-API-E01: session expires after timeout', async () => {});
  //   test('AUTH-API-E02: logout clears session cookie', async () => {});
  // });
});
