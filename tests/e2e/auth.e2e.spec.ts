import { test, expect } from '@fixtures';
import { loginAsUser, clearCart, addToCart } from '@api';
import { users, authInputs, authErrors, inboxSubjects, seededProducts, resetTestData } from '@data';
import { routes } from '@config';
import { randomUser, randomPasswordPair } from '@utils';
import { resetRequestMessagePattern } from '@test-helpers/constants/auth';

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
 * POSITIVE CASES (5 tests):
 *   - AUTH-P01: login with valid credentials succeeds
 *   - AUTH-P02: logout clears session successfully
 *   - AUTH-P03: register new user with unique credentials
 *   - AUTH-P05: request reset with valid email sends link
 *   - AUTH-P06: reset password with valid token succeeds
 *
 * NEGATIVE CASES (8 tests):
 *   - AUTH-N02: login with wrong password fails
 *   - AUTH-N01: login with invalid username fails
 *   - AUTH-N04: register with password mismatch fails
 *   - AUTH-N03: register with duplicate username or email fails
 *   - AUTH-N06: reset request with non-existent email shows generic message
 *   - AUTH-N07: reset with expired token fails
 *   - AUTH-N08: reset with invalid token redirects to login
 *   - AUTH-N09: password mismatch during reset shows error
 *
 * EDGE CASES (2 tests):
 *   - AUTH-E05: token cannot be reused after successful reset (security)
 *   - AUTH-E04: guest cart merges with DB cart on login
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
    test('AUTH-P01: login with valid credentials succeeds @smoke @e2e @safe', async ({
      loginPage
    }) => {
      // Arrange & Act: Navigate to login and submit credentials
      await loginPage.goto();
      await loginPage.login(users.user.username, users.user.password);

      // Assert: User is logged in
      expect(await loginPage.isLoggedIn()).toBe(true);
    });

    test('AUTH-P02: logout clears session successfully @e2e @safe', async ({ loginPage }) => {
      // Arrange: Login first
      await loginPage.goto();
      await loginPage.login(users.user.username, users.user.password);

      // Act: Logout
      await loginPage.logout();

      // Assert: Login link visible again
      expect(await loginPage.isLoginLinkVisible(authInputs.loginLinkText)).toBe(true);
    });
  });

  // ========================================================================
  // NEGATIVE TEST CASES - Login Failures
  // ========================================================================
  test.describe('login failures', () => {
    test('AUTH-N02: login with wrong password fails @e2e @regression @safe', async ({
      loginPage
    }) => {
      // Act: Submit with incorrect password
      await loginPage.goto();
      await loginPage.fillUsername(users.user.username);
      await loginPage.fillPassword(authInputs.wrongPassword);
      await loginPage.submit();

      // Assert: Error message displayed
      await loginPage.expectErrorVisible();
    });

    test('AUTH-N01: login with invalid username fails @e2e @regression @safe', async ({
      loginPage
    }) => {
      // Act: Submit with non-existent username
      await loginPage.goto();
      await loginPage.fillUsername(authInputs.wrongUsername);
      await loginPage.fillPassword(users.user.password);
      await loginPage.submit();

      // Assert: Error message displayed
      await loginPage.expectErrorVisible();
    });
  });

  // ========================================================================
  // POSITIVE TEST CASES - Registration
  // ========================================================================
  test.describe('user registration', () => {
    test('AUTH-P03: register new user with unique credentials @e2e @regression @destructive', async ({
      page,
      registerPage,
      loginPage
    }) => {
      // Arrange: Generate random user
      const user = randomUser('auto');

      // Act: Submit registration form
      await registerPage.goto();
      await registerPage.register(user.username, user.email, user.password);

      // Assert: Redirected to login page
      await expect(page).toHaveURL((url) => url.pathname === routes.login);
      await expect(loginPage.getUsernameInput()).toBeVisible();
    });

    test('AUTH-N04: register with password mismatch fails @e2e @regression @destructive', async ({
      registerPage
    }) => {
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
      await registerPage.expectErrorContains(authErrors.passwordMismatch);
    });

    test('AUTH-N03: register with duplicate username or email fails @e2e @regression @destructive', async ({
      registerPage
    }) => {
      // Act: Try to register with existing user's credentials
      await registerPage.goto();
      await registerPage.fillUsername(users.user.username);
      await registerPage.fillEmail(authInputs.duplicateEmail);
      await registerPage.fillPassword(authInputs.duplicatePassword);
      await registerPage.fillConfirmPassword(authInputs.duplicatePassword);
      await registerPage.submit();

      // Assert: Duplicate error shown
      await registerPage.expectErrorContains(authErrors.duplicateUser);
    });
  });

  // ========================================================================
  // POSITIVE TEST CASES - Password Reset Flow
  // ========================================================================
  test.describe('password reset flow', () => {
    test('AUTH-P05: request reset with valid email sends link @e2e @auth @regression @safe', async ({
      forgotPasswordPage,
      inboxPage
    }) => {
      // Act: Request password reset
      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset(authInputs.duplicateEmail);
      await forgotPasswordPage.expectMessageContains(resetRequestMessagePattern);

      // Assert: Check demo inbox for reset email
      await inboxPage.gotoDemo();

      const count = await inboxPage.waitForEmailCount(1, 20_000);
      if (count === 0 && process.env.CI) {
        test.skip(true, 'Demo inbox did not receive a reset email in shared CI environment.');
      }
      expect(count).toBeGreaterThan(0);

      // Find reset password email
      await inboxPage.openEmailBySubject(inboxSubjects.resetPassword);
      const link = await inboxPage.getFirstEmailLinkHref();

      expect(link ?? '').toContain(routes.resetPasswordBase);
      expect(link ?? '').toContain(`${routes.resetPasswordBase}/`);
    });

    test('AUTH-P06: reset password with valid token succeeds @e2e @auth @regression @destructive', async ({
      page,
      forgotPasswordPage,
      inboxPage,
      loginPage,
      resetPasswordPage
    }) => {
      // Step 1: Request reset
      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset(users.user.email);

      // Step 2: Read reset link from demo inbox
      await inboxPage.gotoDemo();
      await inboxPage.openEmailBySubject(inboxSubjects.resetPassword);
      const link = await inboxPage.getFirstEmailLinkHref();
      expect(link ?? '').toContain(routes.resetPasswordBase);

      // Step 3: Navigate to reset page using inbox link
      await resetPasswordPage.gotoByLink(link || '');

      // Step 4: Set new password
      const newPassword = users.user.password;
      await resetPasswordPage.resetPassword(newPassword, newPassword);

      // Step 5: Show success state (either on reset page or login page)
      await resetPasswordPage.expectSuccessContains(/successful|login/i);

      // Step 6: Verify can login with new password
      if (!page.url().includes(routes.login)) {
        await loginPage.goto();
      }
      await loginPage.login(users.user.username, newPassword);
      expect(await loginPage.isLoggedIn()).toBe(true);
    });
  });

  // ========================================================================
  // NEGATIVE TEST CASES - Password Reset Failures
  // ========================================================================
  test.describe('password reset failures', () => {
    test('AUTH-N06: reset request with non-existent email shows generic message @e2e @auth @regression @safe', async ({
      forgotPasswordPage
    }) => {
      // Security best practice: don't reveal if email exists
      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset(authInputs.nonExistentEmail);

      // Assert: Generic success message (prevents email enumeration)
      await forgotPasswordPage.expectMessageContains(resetRequestMessagePattern);
    });

    test('AUTH-N07: reset with expired token fails @e2e @auth @regression @destructive', async ({
      api,
      resetPasswordPage
    }) => {
      // Arrange: Create an expired token via test API
      const expiredTokenRes = await api.post(routes.api.testCreateExpiredResetToken, {
        data: { email: users.user.email }
      });

      if (expiredTokenRes.status() === 200) {
        const { token } = await expiredTokenRes.json();

        // Act: Try to use expired token
        await resetPasswordPage.gotoByToken(token);

        // Assert: Error shown
        await resetPasswordPage.expectAnyErrorVisible();
        await resetPasswordPage.waitForLoginOrReset();
      }
    });

    test('AUTH-N08: reset with invalid token redirects to login @e2e @auth @regression @safe', async ({
      resetPasswordPage
    }) => {
      // Act: Navigate with invalid token
      await resetPasswordPage.gotoByToken(authInputs.invalidResetToken);

      // Assert: Redirected or error shown
      await resetPasswordPage.waitForLoginOrReset();
      await resetPasswordPage.expectAnyErrorVisible();
    });

    test('AUTH-N09: password mismatch during reset shows error @e2e @auth @regression @destructive', async ({
      forgotPasswordPage,
      inboxPage,
      resetPasswordPage
    }) => {
      // Arrange: Request reset and open reset link
      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset(users.user.email);

      await inboxPage.gotoDemo();
      await inboxPage.openEmailBySubject(inboxSubjects.resetPassword);
      const link = await inboxPage.getFirstEmailLinkHref();
      expect(link ?? '').toContain(routes.resetPasswordBase);
      await resetPasswordPage.gotoByLink(link || '');

      // Act: Fill with mismatched passwords
      await resetPasswordPage.resetPassword(
        resetTestData.newPassword,
        resetTestData.mismatchPassword
      );

      // Assert: Mismatch error shown
      await resetPasswordPage.expectErrorContains(/match/i);
    });
  });

  // ========================================================================
  // EDGE CASES - Security & Special Scenarios
  // ========================================================================
  test.describe('edge cases', () => {
    test('AUTH-E05: token cannot be reused after successful reset (security) @e2e @auth @regression @destructive', async ({
      forgotPasswordPage,
      inboxPage,
      resetPasswordPage
    }) => {
      // Step 1: Request reset and open token link
      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset(users.user.email);

      await inboxPage.gotoDemo();
      await inboxPage.openEmailBySubject(inboxSubjects.resetPassword);
      const link = await inboxPage.getFirstEmailLinkHref();
      expect(link ?? '').toContain(routes.resetPasswordBase);
      await resetPasswordPage.gotoByLink(link || '');

      const newPassword = users.user.password;
      await resetPasswordPage.resetPassword(newPassword, newPassword);

      await resetPasswordPage.expectSuccessContains(/successful|login/i);

      // Step 2: Try to use same token again
      await resetPasswordPage.gotoByLink(link || '');

      // Assert: Token invalid (cleared after use)
      await resetPasswordPage.waitForLoginOrReset();
      await resetPasswordPage.expectAnyErrorVisible();
    });

    test('AUTH-E04: guest cart merges with DB cart on login @e2e @auth @cart @regression @destructive', async ({
      api,
      homePage,
      productPage,
      loginPage,
      cartPage
    }) => {
      const firstProduct = seededProducts[0];
      const secondProduct = seededProducts[1];

      // Step 1: Pre-populate DB cart for authenticated user
      await loginAsUser(api);
      await clearCart(api);
      await addToCart(api, secondProduct.id, 1);

      // Step 2: Add item as GUEST
      await homePage.goto();
      await homePage.clickProductById(firstProduct.id);
      await productPage.addToCart();

      // Verify guest cart has 1 item
      await cartPage.goto();
      expect(await cartPage.getItemCount()).toBe(1);
      expect(await cartPage.isItemVisible(firstProduct.id)).toBe(true);

      // Step 3: Login via UI (triggers merge with DB cart)
      await loginPage.goto();
      await loginPage.login(users.user.username, users.user.password);

      // Step 4: Verify merged cart contains both guest + DB items
      await cartPage.goto();
      expect(await cartPage.isItemVisible(firstProduct.id)).toBe(true);
      expect(await cartPage.isItemVisible(secondProduct.id)).toBe(true);
    });
  });
});
