import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import { addToCart, clearCart } from '@api';
import { routes } from '@config';
import { createOrderWithProviderFallback } from '@test-helpers';

export const createOrderForUser = async (
  api: APIRequestContext,
  items: Array<{ id: number; quantity?: number }>
): Promise<string> => {
  await clearCart(api);
  for (const item of items) {
    await addToCart(api, item.id, item.quantity ?? 1);
  }

  const orderResult = await createOrderWithProviderFallback(api);
  expect(orderResult.status).toBe(200);
  const createOrderBody = orderResult.body;
  expect(createOrderBody.status).toBe('success');
  expect(typeof createOrderBody.orderId).toBe('string');
  expect(createOrderBody.orderId).toContain('ORD-');

  return createOrderBody.orderId as string;
};

export const expectOnOrdersTab = async (
  page: { url: () => string },
  profilePage: { gotoTab: (tab: 'info' | 'orders' | 'claims') => Promise<void> }
) => {
  await profilePage.gotoTab('orders');
  expect(page.url()).toContain(routes.profileOrders);
};
