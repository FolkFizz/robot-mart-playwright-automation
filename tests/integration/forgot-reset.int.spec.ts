import { test, expect } from '@fixtures/base.fixture';

import { ForgotPasswordPage } from '@pages/auth/forgot-password.page';
import { InboxPage } from '@pages/user/inbox.page';
import { authInputs } from '@data/auth';
import { inboxSubjects } from '@data/messages';
import { routes } from '@config/constants';

test.describe('forgot reset integration @integration @auth', () => {
  test.use({ seedData: true });

  test('forgot password sends reset link to demo inbox @integration @auth @regression', async ({ page }) => {
    const forgot = new ForgotPasswordPage(page);
    await forgot.goto();
    await forgot.requestReset(authInputs.duplicateEmail);

    const inbox = new InboxPage(page);
    await inbox.gotoDemo();

    const count = await inbox.getEmailCount();
    expect(count).toBeGreaterThan(0);

    await inbox.openEmailBySubject(inboxSubjects.resetPassword);
    const link = await inbox.getFirstEmailLinkHref();
    expect(link ?? '').toContain(routes.resetPasswordBase);
  });
});
