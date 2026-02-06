import { test, expect } from '@fixtures';
import { authInputs, inboxSubjects } from '@data';
import { routes } from '@config';

test.describe('forgot reset integration @integration @auth', () => {
  test.use({ seedData: true });

  test('forgot password sends reset link to demo inbox @integration @auth @regression', async ({ forgotPasswordPage, inboxPage }) => {
    await forgotPasswordPage.goto();
    await forgotPasswordPage.requestReset(authInputs.duplicateEmail);

    await inboxPage.gotoDemo();

    const count = await inboxPage.getEmailCount();
    expect(count).toBeGreaterThan(0);

    await inboxPage.openEmailBySubject(inboxSubjects.resetPassword);
    const link = await inboxPage.getFirstEmailLinkHref();
    expect(link ?? '').toContain(routes.resetPasswordBase);
  });
});
