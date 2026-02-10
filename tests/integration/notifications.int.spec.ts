import type { APIRequestContext, Page } from '@playwright/test';
import { test, expect, loginAndSyncSession } from '@fixtures';
import { disableChaos } from '@api';
import { routes } from '@config';
import { HomePage, NotificationsPage } from '@pages';

/**
 * =============================================================================
 * NOTIFICATIONS INTEGRATION TESTS
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. UI-API synchronization (counts, list rendering)
 * 2. Notification actions (mark all read)
 * 3. Access control and invalid route handling
 * 4. Cross-tab consistency and payload boundaries
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (3 tests):
 *   - NOTIF-INT-P01: dropdown count aligns with notifications list API
 *   - NOTIF-INT-P02: notifications API returns expected response structure
 *   - NOTIF-INT-P03: each notification object has required fields
 *
 * NEGATIVE CASES (2 tests):
 *   - NOTIF-INT-N01: invalid notification read endpoint returns not found
 *   - NOTIF-INT-N02: unauthorized notifications API access is blocked
 *
 * EDGE CASES (6 tests):
 *   - NOTIF-INT-E01: mark-all-read action updates unread count from API
 *   - NOTIF-INT-E02: UI handles bounded notification list size
 *   - NOTIF-INT-E03: rendered dropdown item count matches API list length
 *   - NOTIF-INT-E04: notifications count stays consistent across tabs
 *   - NOTIF-INT-E05: notification timestamps are valid and not stale
 *   - NOTIF-INT-E06: pagination query keeps response contract stable
 *
 * Business Rules Tested:
 * ----------------------
 * - Integration Point: Notification dropdown (UI) <-> /notifications/list (API)
 * - Response Contract: { status: 'success', notifications: [], unreadCount: number }
 * - Access Control: /notifications/list requires authenticated session
 * - UI Count: Dropdown items reflect API list length (bounded by backend limit)
 * - Action Flow: Mark all read updates unread counter without breaking API schema
 *
 * =============================================================================
 */

type NotificationDto = {
  id: number;
  type: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
};

type NotificationsResponse = {
  status: 'success' | 'error';
  notifications: NotificationDto[];
  unreadCount: number;
  message?: string;
};

const fetchNotifications = async (api: APIRequestContext): Promise<NotificationsResponse> => {
  const res = await api.get(routes.api.notifications, {
    headers: { Accept: 'application/json' }
  });
  expect(res.status()).toBe(200);

  const body = (await res.json()) as NotificationsResponse;
  expect(body.status).toBe('success');
  expect(Array.isArray(body.notifications)).toBe(true);
  expect(typeof body.unreadCount).toBe('number');
  expect(body.unreadCount).toBeGreaterThanOrEqual(0);
  return body;
};

test.use({ seedData: true });

test.describe('notifications integration @integration @notifications', () => {
  test.beforeAll(async () => {
    await disableChaos();
  });

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
  });

  test.describe('positive cases', () => {
    test('NOTIF-INT-P01: dropdown count aligns with notifications list API @integration @notifications @regression', async ({ api, homePage, notificationsPage }) => {
      await homePage.goto();
      await notificationsPage.open();
      const uiCount = await notificationsPage.getNotificationCount();

      const body = await fetchNotifications(api);
      expect(uiCount).toBeLessThanOrEqual(body.notifications.length);
    });

    test('NOTIF-INT-P02: notifications API returns expected response structure @integration @notifications @smoke', async ({ api, homePage }) => {
      await homePage.goto();

      const body = await fetchNotifications(api);
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('notifications');
      expect(body).toHaveProperty('unreadCount');
    });

    test('NOTIF-INT-P03: each notification object has required fields @integration @notifications @regression', async ({ api, homePage }) => {
      await homePage.goto();
      const body = await fetchNotifications(api);

      body.notifications.forEach((n) => {
        expect(typeof n.id).toBe('number');
        expect(typeof n.type).toBe('string');
        expect(typeof n.message).toBe('string');
        expect(typeof n.is_read).toBe('boolean');
        expect(typeof n.created_at).toBe('string');
      });
    });
  });

  test.describe('negative cases', () => {
    test('NOTIF-INT-N01: invalid notification read endpoint returns not found @integration @notifications @regression', async ({ api }) => {
      const res = await api.post(`${routes.api.notifications}/invalid-id-999/read`, {
        maxRedirects: 0
      });
      expect(res.status()).toBe(404);
    });

    test('NOTIF-INT-N02: unauthorized notifications API access is blocked @integration @notifications @security @regression', async ({ request }) => {
      const res = await request.get(routes.api.notifications, {
        maxRedirects: 0
      });
      expect(res.status()).toBe(302);
      expect(res.headers()['location'] ?? '').toContain(routes.login);
    });
  });

  test.describe('edge cases', () => {
    test('NOTIF-INT-E01: mark-all-read action updates unread count from API @integration @notifications @regression', async ({ api, homePage, notificationsPage }) => {
      await homePage.goto();
      await notificationsPage.open();
      await notificationsPage.markAllRead();

      await expect
        .poll(async () => (await fetchNotifications(api)).unreadCount, { timeout: 5_000 })
        .toBe(0);
    });

    test('NOTIF-INT-E02: UI handles bounded notification list size @integration @notifications @regression', async ({ api, homePage, notificationsPage }) => {
      await homePage.goto();
      await notificationsPage.open();
      const uiCount = await notificationsPage.getNotificationCount();

      const body = await fetchNotifications(api);
      // Backend list endpoint is capped (LIMIT 10)
      expect(body.notifications.length).toBeLessThanOrEqual(10);
      expect(uiCount).toBeLessThanOrEqual(10);
      expect(uiCount).toBeLessThanOrEqual(body.notifications.length);
    });

    test('NOTIF-INT-E03: rendered dropdown item count matches API list length @integration @notifications @smoke', async ({ api, homePage, notificationsPage }) => {
      await homePage.goto();
      await notificationsPage.open();
      const uiCount = await notificationsPage.getNotificationCount();

      const body = await fetchNotifications(api);
      expect(uiCount).toBe(body.notifications.length);
    });

    test('NOTIF-INT-E04: notifications count stays consistent across tabs @integration @notifications @regression', async ({ browser, api, homePage, notificationsPage }) => {
      await homePage.goto();

      const contextB = await browser.newContext();
      const pageB = await contextB.newPage();
      try {
        const storage = await api.storageState();
        await contextB.addCookies(storage.cookies);
        const homePageB = new HomePage(pageB);
        const notificationsPageB = new NotificationsPage(pageB);
        await homePageB.goto();

        const countA = await notificationsPage.openAndCount();
        const countB = await notificationsPageB.openAndCount();

        const body = await fetchNotifications(api);
        expect(countA).toBe(body.notifications.length);
        expect(countB).toBe(body.notifications.length);
      } finally {
        await contextB.close();
      }
    });

    test('NOTIF-INT-E05: notification timestamps are valid and not stale @integration @notifications @regression', async ({ api }) => {
      const body = await fetchNotifications(api);
      if (body.notifications.length === 0) return;

      const oldest = body.notifications[body.notifications.length - 1];
      const timestamp = new Date(oldest.created_at);
      expect(Number.isNaN(timestamp.getTime())).toBe(false);

      const ageDays = (Date.now() - timestamp.getTime()) / (1000 * 3600 * 24);
      expect(ageDays).toBeGreaterThanOrEqual(0);
      expect(ageDays).toBeLessThan(365);
    });

    test('NOTIF-INT-E06: pagination query keeps response contract stable @integration @notifications @regression', async ({ api }) => {
      const res = await api.get(`${routes.api.notifications}?page=2`, {
        headers: { Accept: 'application/json' }
      });
      expect(res.status()).toBe(200);

      const body = (await res.json()) as NotificationsResponse;
      expect(body.status).toBe('success');
      expect(Array.isArray(body.notifications)).toBe(true);
      expect(typeof body.unreadCount).toBe('number');
    });
  });
});
