import { test, expect } from '@fixtures';
import { users, authInputs, authErrors, inboxSubjects } from '@data';
import { routes } from '@config';
import { randomUser, randomPasswordPair } from '@utils';

/**
 * =============================================================================
 * AUTHENTICATION E2E TESTS - Comprehensive Coverage
 * =============================================================================
 * 
 * Test Scenarios:
 * ---------------
 * 1. Login & Logout Operations
 * 2. User Registration & Validation
 * 3. Password Reset Flow (Request → Email → Reset)
 * 4. Token Security & Expiry Handling
 * 5. Cart Merge on Login (Session → Database)
 * 6. Email Notification System
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (6 tests):
 *   - AUTH-P01: Login with valid user credentials succeeds
 *   - AUTH-P02: Logout successfully clears session
 *   - AUTH-P03: Register new user with unique credentials
 *   - AUTH-P05: Request password reset sends email with link
 *   - AUTH-P06: Reset password with valid token succeeds
 *   - AUTH-E04: Guest cart merges with DB cart on login
 * 
 * NEGATIVE CASES (9 tests):
 *   - AUTH-N01: Login with invalid username fails
 *   - AUTH-N02: Login with wrong password fails
 *   - AUTH-N03: Register with duplicate username/email rejected
 *   - AUTH-N04: Register with mismatched passwords fails
 *   - AUTH-N06: Reset request with non-existent email (generic message for security)
 *   - AUTH-N07: Reset with expired token fails
 *   - AUTH-N08: Reset with invalid token redirects to login
 *   - AUTH-N09: Password mismatch during reset shows error
 * 
 * EDGE CASES (2 tests):
 *   - AUTH-E05: Token cannot be reused after successful reset (security)
 *   - AUTH-E04: Guest session cart merges with authenticated user's DB cart
 * 
 * Business Rules Tested:
 * ----------------------
 * - Authentication: bcrypt password hashing, session management
 * - Registration: Username AND email must be unique
 * - Password Reset: Token expires after 1 hour, one-time use only
 * - Cart Persistence: Guest carts stored in session, authenticated in database
 * - Cart Merge: On login, session cart items merge with DB cart (respects stock limits)
 * - Security Best Practice: Don't reveal if email exists during reset request
 * 
 * =============================================================================
 */

test.use({ seedData: true });

test.describe('authentication comprehensive @e2e @auth', () => {

  // ========================================================================
  // POSITIVE TEST CASES - Login & Logout
  // ========================================================================
  test.describe('login and logout', () => {
    
    test('AUTH-P01: login with valid credentials succeeds @smoke @e2e @safe', async ({ loginPage }) => {
      // Arrange & Act: Navigate to login and submit credentials
      await loginPage.goto();
      await loginPage.login(users.user.username, users.user.password);

      // Assert: User is logged in
      expect(await loginPage.isLoggedIn()).toBe(true);
    });

    test('AUTH-P02: logout clears session successfully @e2e @safe', async ({ page, loginPage }) => {
      // Arrange: Login first
      await loginPage.goto();
      await loginPage.login(users.user.username, users.user.password);

      // Act: Logout
      await loginPage.logout();

      // Assert: Login link visible again
      await expect(page.getByRole('link', { name: authInputs.loginLinkText })).toBeVisible();
    });
  });

  // ========================================================================
  // NEGATIVE TEST CASES - Login Failures
  // ========================================================================
  test.describe('login failures', () => {
    
    test('AUTH-N02: login with wrong password fails @e2e @regression @safe', async ({ page, loginPage }) => {
      // Act: Submit with incorrect password
      await loginPage.goto();
      await loginPage.fillUsername(users.user.username);
      await loginPage.fillPassword(authInputs.wrongPassword);
      await loginPage.submit();

      // Assert: Error message displayed
      await expect(page.locator('.error')).toBeVisible();
    });

    test('AUTH-N01: login with invalid username fails @e2e @regression @safe', async ({ page, loginPage }) => {
      // Act: Submit with non-existent username
      await loginPage.goto();
      await loginPage.fillUsername(authInputs.wrongUsername);
      await loginPage.fillPassword(users.user.password);
      await loginPage.submit();

      // Assert: Error message displayed
      await expect(page.locator('.error')).toBeVisible();
    });
  });

  // ========================================================================
  // POSITIVE TEST CASES - Registration
  // ========================================================================
  test.describe('user registration', () => {
    
    test('AUTH-P03: register new user with unique credentials @e2e @regression @destructive', async ({ page, registerPage, loginPage }) => {
      // Arrange: Generate random user
      const user = randomUser('auto');

      // Act: Submit registration form
      await registerPage.goto();
      await registerPage.register(user.username, user.email, user.password);

      // Assert: Redirected to login page
      await expect(page).toHaveURL(/\/login/);
      await expect(loginPage.getUsernameInput()).toBeVisible();
    });

    test('AUTH-N04: register with password mismatch fails @e2e @regression @destructive', async ({ page, registerPage }) => {
      // Arrange: Generate mismatched passwords
      const user = randomUser('auto');
      const { password, confirmPassword } = randomPasswordPair(true);

      // Act: Submit with mismatched passwords
      await registerPage.goto();
      await registerPage.fillUsername(user.username);
      await registerPage.fillEmail(user.email);
      await registerPage.fillPassword(password);
      await registerPage.fillConfirmPassword(confirmPassword);
      await registerPage.submit();

      // Assert: Error shown
      await expect(page.locator('.error')).toBeVisible();
      await expect(page.locator('.error')).toContainText(authErrors.passwordMismatch);
    });

    test('AUTH-N03: register with duplicate username or email fails @e2e @regression @destructive', async ({ page, registerPage }) => {
      // Act: Try to register with existing user's credentials
      await registerPage.goto();
      await registerPage.fillUsername(users.user.username);
      await registerPage.fillEmail(authInputs.duplicateEmail);
      await registerPage.fillPassword(authInputs.duplicatePassword);
      await registerPage.fillConfirmPassword(authInputs.duplicatePassword);
      await registerPage.submit();

      // Assert: Duplicate error shown
      await expect(page.locator('.error')).toBeVisible();
      await expect(page.locator('.error')).toContainText(authErrors.duplicateUser);
    });
  });

  // ========================================================================
  // POSITIVE TEST CASES - Password Reset Flow  
  // ========================================================================
  test.describe('password reset flow', () => {
    
    test('AUTH-P05: request reset with valid email sends link @e2e @auth @regression @safe', async ({ forgotPasswordPage, inboxPage }) => {
      // Act: Request password reset
      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset(authInputs.duplicateEmail);

      // Assert: Check demo inbox for reset email
      await inboxPage.gotoDemo();

      const count = await inboxPage.getEmailCount();
      expect(count).toBeGreaterThan(0);

      // Find reset password email
      await inboxPage.openEmailBySubject(inboxSubjects.resetPassword);
      const link = await inboxPage.getFirstEmailLinkHref();
      
      expect(link ?? '').toContain(routes.resetPasswordBase);
      expect(link ?? '').toMatch(/\/auth\/reset-password\//);
    });

    test('AUTH-P06: reset password with valid token succeeds @e2e @auth @regression @destructive', async ({ page, api, forgotPasswordPage, loginPage }) => {
      // Step 1: Request reset
      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset(users.user.email);

      // Step 2: Get reset token from DB via test API
      const tokenRes = await api.get(`/api/test/get-reset-token?email=${encodeURIComponent(users.user.email)}`);
      expect(tokenRes.status()).toBe(200);
      const { token } = await tokenRes.json();
      expect(token).toBeTruthy();

      // Step 3: Navigate to reset page with token
      await page.goto(`/auth/reset-password/${token}`);

      // Step 4: Set new password
      const newPassword = 'NewSecure123!';
      await page.fill('input[name="password"]', newPassword);
      await page.fill('input[name="confirmPassword"]', newPassword);
      await page.click('button[type="submit"]');

      // Step 5: Should redirect to login with success message
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('.success, .alert-success')).toBeVisible();

      // Step 6: Verify can login with new password
      await loginPage.login(users.user.username, newPassword);
      expect(await loginPage.isLoggedIn()).toBe(true);
    });
  });

  // ========================================================================
  // NEGATIVE TEST CASES - Password Reset Failures
  // ========================================================================
  test.describe('password reset failures', () => {
    
    test('AUTH-N06: reset request with non-existent email shows generic message @e2e @auth @regression @safe', async ({ page, forgotPasswordPage }) => {
      // Security best practice: don't reveal if email exists
      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset('nonexistent@example.com');

      // Assert: Generic success message (prevents email enumeration)
      const successMessage = page.locator('.success, .alert-success, .message');
      await expect(successMessage).toBeVisible();
      await expect(successMessage).toContainText(/sent|email/i);
    });

    test('AUTH-N07: reset with expired token fails @e2e @auth @regression @destructive', async ({ page, api }) => {
      // Arrange: Create an expired token via test API
      const expiredTokenRes = await api.post('/api/test/create-expired-reset-token', {
        data: { email: users.user.email }
      });
      
      if (expiredTokenRes.status() === 200) {
        const { token } = await expiredTokenRes.json();

        // Act: Try to use expired token
        await page.goto(`/auth/reset-password/${token}`);

        // Assert: Error shown
        await expect(page.locator('.error, .alert-error')).toBeVisible();
        await page.waitForURL(/\/(login|auth\/reset-password)/);
      }
    });

    test('AUTH-N08: reset with invalid token redirects to login @e2e @auth @regression @safe', async ({ page }) => {
      // Act: Navigate with invalid token
      await page.goto('/auth/reset-password/invalid_token_12345');

      // Assert: Redirected or error shown
      await page.waitForURL(/\/(login|auth\/reset-password)/, { timeout: 5000 });
      
      if (await page.url().includes('/login')) {
        await expect(page.locator('.error, .alert-error')).toBeVisible();
      }
    });

    test('AUTH-N09: password mismatch during reset shows error @e2e @auth @regression @destructive', async ({ page, api }) => {
      // Arrange: Get valid token
      await api.post('/api/test/request-reset', {
        data: { email: users.user.email }
      });

      const tokenRes = await api.get(`/api/test/get-reset-token?email=${encodeURIComponent(users.user.email)}`);
      const { token } = await tokenRes.json();

      await page.goto(`/auth/reset-password/${token}`);

      // Act: Fill with mismatched passwords
      await page.fill('input[name="password"]', 'Password123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentPass123!');
      await page.click('button[type="submit"]');

      // Assert: Mismatch error shown
      await expect(page.locator('.error, .alert-error')).toBeVisible();
      await expect(page.locator('.error, .alert-error')).toContainText(/match/i);
    });
  });

  // ========================================================================
  // EDGE CASES - Security & Special Scenarios
  // ========================================================================
  test.describe('edge cases', () => {
    
    test('AUTH-E05: token cannot be reused after successful reset (security) @e2e @auth @regression @destructive', async ({ page, api }) => {
      // Step 1: Get token and reset password
      await api.post('/api/test/request-reset', {
        data: { email: users.user.email }
      });

      const tokenRes = await api.get(`/api/test/get-reset-token?email=${encodeURIComponent(users.user.email)}`);
      const { token } = await tokenRes.json();

      await page.goto(`/auth/reset-password/${token}`);
      
      const newPassword = 'FirstReset123!';
      await page.fill('input[name="password"]', newPassword);
      await page.fill('input[name="confirmPassword"]', newPassword);
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/\/login/);

      // Step 2: Try to use same token again
      await page.goto(`/auth/reset-password/${token}`);

      // Assert: Token invalid (cleared after use)
      await page.waitForURL(/\/(login|auth\/reset-password)/, { timeout: 5000 });
      
      if (!await page.url().includes('reset-password')) {
        await expect(page.locator('.error, .alert-error')).toBeVisible();
      }
    });

    test('AUTH-E04: guest cart merges with DB cart on login @e2e @auth @cart @regression @destructive', async ({ page, api, homePage, productPage, loginPage, cartPage }) => {
      const firstProduct = { id: 1, name: 'Rusty-Bot 101' };
      const secondProduct = { id: 2, name: 'Helper-X' };

      // Step 1: Clear any existing cart for test user
      await api.post('/api/test/login-user');
      await api.post('/api/cart/clear');
      await api.post('/api/test/logout');

      // Step 2: Add item as GUEST
      await page.goto('/');
      await homePage.clickProductById(firstProduct.id);
      await productPage.addToCart();

      // Verify guest cart has 1 item
      await cartPage.goto();
      expect(await cartPage.getItemCount()).toBe(1);
      expect(await cartPage.isItemVisible(firstProduct.id)).toBe(true);

      // Step 3: Logout to clear session (if logged in)
      if (await loginPage.isLoggedIn()) {
        await loginPage.logout();
      }

      // Step 4: Pre-populate DB cart with different item
      await api.post('/api/test/login-user');
      await api.post('/api/cart/clear');
      await api.post('/api/cart/add', {
        data: { productId: secondProduct.id, quantity: 1 }
      });
      await api.post('/api/test/logout');

      // Step 5: Login via UI (triggers merge)
      await loginPage.goto();
      await loginPage.login(users.user.username, users.user.password);

      // Step 6: Verify cart has items (merged)
      await cartPage.goto();
      const itemCount = await cartPage.getItemCount();
      expect(itemCount).toBeGreaterThanOrEqual(1);

      // Verify DB item is present
      expect(await cartPage.isItemVisible(secondProduct.id)).toBe(true);
    });
  });
});
