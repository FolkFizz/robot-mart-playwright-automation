import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import { setProductStock } from '@api';

export const ensureProductStock = async (
  api: APIRequestContext,
  productId: number,
  stock: number
): Promise<void> => {
  const res = await setProductStock(api, productId, stock);
  expect(res.status()).toBe(200);
  const body = (await res.json().catch(() => null)) as {
    status?: string;
    productId?: number;
    stock?: number;
  } | null;
  expect(body?.status).toBe('ok');
  expect(body?.productId).toBe(productId);
  expect(body?.stock).toBe(stock);
};
