import { test, expect } from '@fixtures';
import { authInputs, inboxSubjects, buildNonExistentEmail, resetTestData } from '@data';
import { routes } from '@config';
import { disableChaos } from '@api';
import { ResetPasswordPage } from '@pages';
import { registerIsolatedUser } from '@test-helpers';
import {
  expireResetTokenByEmail,
  extractTokenFromLink,
  readResetTokenByEmail,
  requestResetAndOpenInboxEmail,
  resetTokenPattern
} from '@test-helpers/helpers/password-reset';

/**
 * =============================================================================
 * PASSWORD RESET INTEGRATION TESTS
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Forgot Password flow (UI -> Email -> Reset link)
 * 2. Token validation (format, expiry, one-time use)
 * 3. Security behavior (generic response, invalid route handling)
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (3 tests):
 *   - RESET-INT-P01: forgot password sends reset link to demo inbox
 *   - RESET-INT-P02: reset email has expected subject pattern
 *   - RESET-INT-P03: reset link uses valid URL and token format
 *
 * NEGATIVE CASES (4 tests):
 *   - RESET-INT-N01: non-existent email shows generic success message
 *   - RESET-INT-N02: invalid email format blocked by HTML5 validation
 *   - RESET-INT-N03: expired reset token is rejected
 *   - RESET-INT-N04: used reset token cannot be reused
 *
 * EDGE CASES (5 tests):
 *   - RESET-INT-E01: repeated reset requests rotate token for same user
 *   - RESET-INT-E02: reset link contains hex token in route param
 *   - RESET-INT-E03: reset link is usable from fresh browser context
 *   - RESET-INT-E04: reset email body includes reset instructions
 *   - RESET-INT-E05: query-param token route is not accepted
 *
 * Business Rules Tested:
 * ----------------------
 * - Integration: Forgot Password page -> Email service -> Demo inbox
 * - Link Format: /reset-password/{token}
 * - Token Format: 64-char hex token generated server-side
 * - Security: Generic response for unknown email, one-time token use
 * - Expiry: Expired token must be rejected by reset page guard
 *
 * =============================================================================
 */

test.use({ seedData: true });

test.describe('password reset integration @integration @auth', () => {
  test.beforeAll(async () => {
    await disableChaos();
  });

  test.describe('positive cases', () => {
    test('RESET-INT-P01: forgot password sends reset link to demo inbox @integration @auth @regression', async ({
      forgotPasswordPage,
      inboxPage
    }) => {
      // Arrange: Request reset for seeded user.
      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset(authInputs.duplicateEmail);

      // Act: Verify UI message and open reset email.
      const message = (await forgotPasswordPage.getMessageText()).toLowerCase();
      expect(message).toContain('inbox');

      await inboxPage.gotoDemo();
      await inboxPage.openEmailBySubject(inboxSubjects.resetPassword);

      // Assert: Reset link contains valid token format.
      const link = await inboxPage.getFirstEmailLinkHref();
      expect(link).toBeTruthy();
      extractTokenFromLink(link ?? '');
    });

    test('RESET-INT-P02: reset email has expected subject pattern @integration @auth @smoke', async ({
      forgotPasswordPage,
      inboxPage
    }) => {
      await requestResetAndOpenInboxEmail(forgotPasswordPage, inboxPage, authInputs.duplicateEmail);
      const subject = (await inboxPage.getLatestSubjectText()).toLowerCase();
      expect(subject).toContain('reset');
      expect(subject).toContain('password');
    });

    test('RESET-INT-P03: reset link uses valid URL and token format @integration @auth @regression', async ({
      forgotPasswordPage,
      inboxPage
    }) => {
      await requestResetAndOpenInboxEmail(forgotPasswordPage, inboxPage, authInputs.duplicateEmail);
      const link = await inboxPage.getFirstEmailLinkHref();

      expect(link).toBeTruthy();
      const parsed = new URL(link ?? '', 'http://localhost');
      expect(parsed.pathname).toContain(routes.resetPasswordBase);
      extractTokenFromLink(link ?? '');
    });
  });

  test.describe('negative cases', () => {
    test('RESET-INT-N01: non-existent email shows generic success message @integration @auth @security @regression', async ({
      forgotPasswordPage
    }) => {
      const fakeEmail = buildNonExistentEmail(String(Date.now()));

      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset(fakeEmail);

      const message = (await forgotPasswordPage.getMessageText()).toLowerCase();
      expect(message).toContain('if that email exists');

      await forgotPasswordPage.expectNoErrorText();
    });

    test('RESET-INT-N02: invalid email format blocked by HTML5 validation @integration @auth @regression', async ({
      page,
      forgotPasswordPage
    }) => {
      await forgotPasswordPage.goto();

      const emailInput = forgotPasswordPage.getEmailInput();
      await emailInput.fill('not-an-email');

      const isValid = await forgotPasswordPage.isEmailValid();
      expect(isValid).toBe(false);

      await forgotPasswordPage.getSubmitButton().click();
      await expect(page).toHaveURL((url) => url.pathname === routes.forgotPassword);

      const message = (await forgotPasswordPage.getMessageText().catch(() => '')).trim();
      expect(message).toBe('');
    });

    test('RESET-INT-N03: expired reset token is rejected @integration @auth @security @regression', async ({
      api,
      forgotPasswordPage,
      resetPasswordPage,
      loginPage
    }, testInfo) => {
      const user = await registerIsolatedUser(api, {
        prefix: 'reset',
        workerIndex: testInfo.workerIndex
      });

      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset(user.email);
      const token = await readResetTokenByEmail(user.email);

      await expireResetTokenByEmail(user.email);
      await resetPasswordPage.gotoByToken(token);

      expect(await loginPage.hasAnyLoginInputVisible()).toBe(true);
      await resetPasswordPage.expectErrorContains(/invalid|expired/i);
    });

    test('RESET-INT-N04: used reset token cannot be reused @integration @auth @security @regression', async ({
      api,
      forgotPasswordPage,
      resetPasswordPage,
      loginPage
    }, testInfo) => {
      const user = await registerIsolatedUser(api, {
        prefix: 'reset',
        workerIndex: testInfo.workerIndex
      });

      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset(user.email);
      const token = await readResetTokenByEmail(user.email);

      await resetPasswordPage.gotoByToken(token);
      await resetPasswordPage.resetPassword(resetTestData.newPassword, resetTestData.newPassword);

      await resetPasswordPage.expectSuccessContains(/reset successful|please login/i);

      await resetPasswordPage.gotoByToken(token);
      expect(await loginPage.hasAnyLoginInputVisible()).toBe(true);
      await resetPasswordPage.expectErrorContains(/invalid|expired/i);
    });
  });

  test.describe('edge cases', () => {
    test('RESET-INT-E01: repeated reset requests rotate token for same user @integration @auth @regression', async ({
      api,
      forgotPasswordPage
    }, testInfo) => {
      const user = await registerIsolatedUser(api, {
        prefix: 'reset',
        workerIndex: testInfo.workerIndex
      });

      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset(user.email);
      const tokenFirst = await readResetTokenByEmail(user.email);

      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset(user.email);
      const tokenSecond = await readResetTokenByEmail(user.email);

      expect(tokenFirst).toMatch(resetTokenPattern);
      expect(tokenSecond).toMatch(resetTokenPattern);
      expect(tokenSecond).not.toBe(tokenFirst);
    });

    test('RESET-INT-E02: reset link contains hex token in route param @integration @auth @smoke', async ({
      forgotPasswordPage,
      inboxPage
    }) => {
      await requestResetAndOpenInboxEmail(forgotPasswordPage, inboxPage, authInputs.duplicateEmail);
      const link = await inboxPage.getFirstEmailLinkHref();

      expect(link).toBeTruthy();
      const token = extractTokenFromLink(link ?? '');
      expect(token).toMatch(resetTokenPattern);
    });

    test('RESET-INT-E03: reset link is usable from fresh browser context @integration @auth @regression', async ({
      api,
      browser,
      forgotPasswordPage
    }, testInfo) => {
      const user = await registerIsolatedUser(api, {
        prefix: 'reset',
        workerIndex: testInfo.workerIndex
      });

      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset(user.email);
      const token = await readResetTokenByEmail(user.email);
      const link = routes.resetPassword(token);

      const contextB = await browser.newContext();
      const pageB = await contextB.newPage();
      try {
        const resetPageB = new ResetPasswordPage(pageB);
        await resetPageB.gotoByLink(link);
        await resetPageB.expectPasswordInputsVisible();
      } finally {
        await contextB.close();
      }
    });

    test('RESET-INT-E04: reset email body includes reset instructions @integration @auth @regression', async ({
      forgotPasswordPage,
      inboxPage
    }) => {
      await requestResetAndOpenInboxEmail(forgotPasswordPage, inboxPage, authInputs.duplicateEmail);
      const body = (await inboxPage.getEmailBodyText()).toLowerCase();

      expect(body).toContain('you requested to reset your password');
      expect(body).toContain("if you didn't ask for this");
    });

    test('RESET-INT-E05: query-param token route is not accepted @integration @auth @security @regression', async ({
      resetPasswordPage
    }) => {
      const invalidUrl = `${routes.resetPasswordBase}?token=INVALID_CHARS_!@#$%^`;

      const res = await resetPasswordPage.gotoByLinkWithResponse(invalidUrl);
      expect(res).not.toBeNull();
      expect(res?.status()).toBe(404);

      const body = (await resetPasswordPage.getBodyText()).toLowerCase();
      expect(body).toContain('404');
      expect(body).toContain('not found');
    });
  });
});
