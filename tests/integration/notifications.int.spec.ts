import { test, expect, loginAndSyncSession } from '@fixtures';
import { routes } from '@config';

test.describe('notifications integration @integration @notifications', () => {
  test.use({ seedData: true });

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
  });

  test('dropdown count aligns with api list @integration @notifications @regression', async ({ api, homePage, notificationsPage }) => {
    await homePage.goto();

    await notificationsPage.open();
    const uiCount = await notificationsPage.getNotificationCount();

    const res = await api.get(routes.api.notifications);
    const body = await res.json();

    expect(body.status).toBe('success');
    expect(Array.isArray(body.notifications)).toBe(true);
    expect(uiCount).toBeLessThanOrEqual(body.notifications.length);
    expect(body.unreadCount).toBeGreaterThanOrEqual(0);
  });
});
