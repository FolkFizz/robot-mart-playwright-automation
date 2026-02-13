import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import { addToCart, clearCart } from '@api';
import { routes } from '@config';
import {
  canRunPrivilegedStockTests,
  createOrderWithProviderFallback,
  privilegedStockSkipReason
} from '@test-helpers';
import type {
  InventoryCartMutationResponse,
  InventoryOrderCreateResponse,
  InventoryOrderCreateResult,
  ProductCartCartMutationResponse,
  ProductCartCartStateResponse,
  ProductCartProductDetailResponse
} from '@test-helpers/types/integration-contracts';
import type { AuthorizationOrderCreateResponse } from '@test-helpers/types/security-contracts';

type CartMutationResponse = InventoryCartMutationResponse | ProductCartCartMutationResponse;

type OrderMutationResponse = InventoryOrderCreateResponse | CartMutationResponse;

export const canRunStockMutationTests = () => canRunPrivilegedStockTests('TEST_API_KEY');
export const stockMutationSkipReason = privilegedStockSkipReason('TEST_API_KEY');

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

export const createOrderForUser = async (
  api: APIRequestContext,
  items: Array<{ id: number; quantity?: number }>
): Promise<string> => {
  return await createOrderForCurrentSession(api, items);
};

export const expectOnOrdersTab = async (
  page: { url: () => string },
  profilePage: { gotoTab: (tab: 'info' | 'orders' | 'claims') => Promise<void> }
) => {
  await profilePage.gotoTab('orders');
  expect(page.url()).toContain(routes.profileOrders);
};

export const getProductDetail = async (
  api: APIRequestContext,
  productId: number
): Promise<ProductCartProductDetailResponse['product']> => {
  const res = await api.get(routes.api.productDetail(productId), {
    headers: { Accept: 'application/json' }
  });
  expect(res.status()).toBe(200);

  const body = (await res.json()) as ProductCartProductDetailResponse;
  expect(body.ok).toBe(true);
  expect(body.product.id).toBe(productId);
  return body.product;
};

export const getProductStock = async (
  api: APIRequestContext,
  productId: number
): Promise<number> => {
  const product = await getProductDetail(api, productId);
  expect(typeof product.stock).toBe('number');
  return product.stock;
};

export const addToCartRaw = async (
  api: APIRequestContext,
  productId: number,
  quantity: number
) => {
  const res = await api.post(routes.api.cartAdd, {
    data: { productId, quantity },
    headers: { Accept: 'application/json' },
    maxRedirects: 0
  });

  const body = (await res.json().catch(() => ({}))) as CartMutationResponse;
  return { status: res.status(), body };
};

export const getCartItem = async (api: APIRequestContext, productId: number) => {
  const res = await api.get(routes.api.cart, {
    headers: { Accept: 'application/json' }
  });
  expect(res.status()).toBe(200);

  const body = (await res.json()) as ProductCartCartStateResponse;
  expect(body.ok).toBe(true);
  return body.cart.find((item) => item.id === productId);
};

export const expectStockValidationError = (body: CartMutationResponse) => {
  expect(body.status).toBe('error');
  expect((body.message ?? '').toLowerCase()).toContain('stock');
};

export const extractMessage = (body: OrderMutationResponse): string => {
  if (typeof body.message === 'string') return body.message;
  if ('error' in body && typeof body.error?.message === 'string') return body.error.message;
  return '';
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
