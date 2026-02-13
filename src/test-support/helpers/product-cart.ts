import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import { routes } from '@config';
import { canRunPrivilegedStockTests, privilegedStockSkipReason } from '@test-helpers';
import type {
  ProductCartCartMutationResponse,
  ProductCartCartStateResponse,
  ProductCartProductDetailResponse
} from '@test-helpers/types/integration-contracts';

export const canRunStockMutationTests = () => canRunPrivilegedStockTests('TEST_API_KEY');
export const stockMutationSkipReason = privilegedStockSkipReason('TEST_API_KEY');

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

  const body = (await res.json().catch(() => ({}))) as ProductCartCartMutationResponse;
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

export const expectStockValidationError = (body: ProductCartCartMutationResponse) => {
  expect(body.status).toBe('error');
  expect((body.message ?? '').toLowerCase()).toContain('stock');
};
