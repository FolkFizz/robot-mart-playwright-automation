import { test, expect } from '@fixtures';
import { authInputs, inboxSubjects } from '@data';
import { routes } from '@config';

/**
 * =============================================================================
 * PASSWORD RESET INTEGRATION TESTS
 * =============================================================================
 * 
 * Test Scenarios:
 * ---------------
 * 1. Forgot Password Flow (UI → Email → Reset Link)
 * 2. Email Service Integration (Demo Inbox)
 * 3. Reset Link Generation & Validation
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (1 test):
 *   - RESET-INT-P01: Forgot password sends reset link to demo inbox
 * 
 * NEGATIVE CASES (0 tests):
 *   - (Future: Invalid email, email service failure)
 * 
 * EDGE CASES (0 tests):
 *   - (Future: Multiple reset requests, expired links)
 * 
 * Business Rules Tested:
 * ----------------------
 * - Integration Points: Forgot Password Page → Email Service → Demo Inbox
 * - Email Service: Uses demo inbox for testing (no real SMTP)
 * - Reset Link Format: /auth/reset-password/{token}
 * - Email Subject: Matches expected subject from inboxSubjects
 * - Demo Inbox Access: /demo/inbox (test utility page)
 * - Token Validation: Link contains valid reset-password route
 * 
 * =============================================================================
 */

test.describe('password reset integration @integration @auth', () => {
  test.use({ seedData: true });

  test.describe('positive cases', () => {

    test('RESET-INT-P01: forgot password sends reset link to demo inbox @integration @auth @regression', async ({ forgotPasswordPage, inboxPage }) => {
      // Arrange & Act: Request password reset
      await forgotPasswordPage.goto();
      await forgotPasswordPage.requestReset(authInputs.duplicateEmail);

      // Act: Navigate to demo inbox
      await inboxPage.gotoDemo();

      // Assert: Email received
      const count = await inboxPage.getEmailCount();
      expect(count).toBeGreaterThan(0);

      // Assert: Email contains reset link
      await inboxPage.openEmailBySubject(inboxSubjects.resetPassword);
      const link = await inboxPage.getFirstEmailLinkHref();
      expect(link ?? '').toContain(routes.resetPasswordBase);
    });
  });

  // Future test cases:
  // test.describe('negative cases', () => {
  //   test('RESET-INT-N01: non-existent email still shows success (security)', async () => {});
  // });
});
