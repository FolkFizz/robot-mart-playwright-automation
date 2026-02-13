import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import { routes } from '@config';
import type { NotificationsResponse } from '@test-helpers/types/integration-contracts';

export const fetchNotifications = async (api: APIRequestContext): Promise<NotificationsResponse> => {
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

export const openDropdownAndGetUiCount = async (
  homePage: { goto: () => Promise<void> },
  notificationsPage: { open: () => Promise<void>; getNotificationCount: () => Promise<number> }
) => {
  await homePage.goto();
  await notificationsPage.open();
  return await notificationsPage.getNotificationCount();
};
