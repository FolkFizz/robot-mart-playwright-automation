import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import { routes } from '@config';
import { createOrderWithProviderFallback } from '@test-helpers';
import type {
  InventoryCartMutationResponse,
  InventoryOrderCreateResponse,
  InventoryOrderCreateResult,
  InventoryProductDetailResponse
} from '@test-helpers/types/integration-contracts';

export const extractMessage = (
  body: InventoryCartMutationResponse | InventoryOrderCreateResponse
): string => {
  if (typeof body.message === 'string') return body.message;
  if ('error' in body && typeof body.error?.message === 'string') return body.error.message;
  return '';
};

export const getProductStock = async (api: APIRequestContext, id: number): Promise<number> => {
  const res = await api.get(routes.api.productDetail(id), {
    headers: { Accept: 'application/json' }
  });
  expect(res.status()).toBe(200);

  const body = (await res.json()) as InventoryProductDetailResponse;
  expect(body.ok).toBe(true);
  expect(body.product.id).toBe(id);
  expect(typeof body.product.stock).toBe('number');
  return body.product.stock;
};

export const addToCartRaw = async (api: APIRequestContext, id: number, quantity: number) => {
  const res = await api.post(routes.api.cartAdd, {
    data: { productId: id, quantity },
    headers: { Accept: 'application/json' },
    maxRedirects: 0
  });

  const body = (await res.json().catch(() => ({}))) as InventoryCartMutationResponse;
  return { status: res.status(), body };
};

export const createOrderFromCart = async (
  api: APIRequestContext
): Promise<InventoryOrderCreateResult> => {
  const result = await createOrderWithProviderFallback(api);
  return {
    status: result.status,
    body: result.body as InventoryOrderCreateResponse
  };
};

export const expectOrderSuccess = (order: InventoryOrderCreateResult) => {
  expect(order.status).toBe(200);
  expect(order.body.status).toBe('success');
};

export const expectStockError = (order: InventoryOrderCreateResult) => {
  expect(order.status).toBe(400);
  expect(order.body.status).toBe('error');
  expect(extractMessage(order.body)).toMatch(/only|remain|stock|cart is empty/i);
};
