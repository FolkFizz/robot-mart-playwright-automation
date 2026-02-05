import { test, expect, loginAndSyncSession } from '@fixtures/base.fixture';

import { HomePage } from '@pages/home.page';
import { NotificationsPage } from '@pages/user/notifications.page';
import { routes } from '@config/constants';

test.describe('notifications integration @integration @notifications', () => {
  test.use({ seedData: true });

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
  });

  test('dropdown count aligns with api list @integration @notifications @regression', async ({ api, page }) => {
    const home = new HomePage(page);
    await home.goto();

    const notifications = new NotificationsPage(page);
    await notifications.open();
    const uiCount = await notifications.getNotificationCount();

    const res = await api.get(routes.api.notifications);
    const body = await res.json();

    expect(body.status).toBe('success');
    expect(Array.isArray(body.notifications)).toBe(true);
    expect(uiCount).toBeLessThanOrEqual(body.notifications.length);
    expect(body.unreadCount).toBeGreaterThanOrEqual(0);
  });
});
