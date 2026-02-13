import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import { addToCart, clearCart } from '@api';
import { createOrderWithProviderFallback } from '@test-helpers';
import type { AuthorizationOrderCreateResponse } from '@test-helpers/types/security-contracts';

export const createOrderForCurrentSession = async (
  api: APIRequestContext,
  items: Array<{ id: number; quantity?: number }>
): Promise<string> => {
  await clearCart(api);
  for (const item of items) {
    await addToCart(api, item.id, item.quantity ?? 1);
  }

  const result = await createOrderWithProviderFallback(api);
  expect(result.status).toBe(200);

  const body = result.body as AuthorizationOrderCreateResponse;
  expect(body.status).toBe('success');
  expect(body.orderId).toMatch(/^ORD-/);

  return body.orderId as string;
};
