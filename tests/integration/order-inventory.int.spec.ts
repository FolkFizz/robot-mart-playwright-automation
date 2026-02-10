import type { APIRequestContext } from '@playwright/test';
import { test, expect, seedCart } from '@fixtures';
import { disableChaos, loginAsUser } from '@api';
import { routes } from '@config';
import { seededProducts } from '@data';
import { ensureProductStock } from '../helpers/inventory';
import { createIsolatedUserContext } from '../helpers/users';

/**
 * =============================================================================
 * ORDER-INVENTORY INTEGRATION TESTS
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Order creation to stock deduction
 * 2. Stock deduction accuracy vs ordered quantity
 * 3. Out-of-stock and over-limit validations
 * 4. Concurrent checkout and stale-cart validation
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (3 tests):
 *   - ORD-INV-INT-P01: stock decreases after successful order
 *   - ORD-INV-INT-P02: stock reduction equals ordered quantity
 *   - ORD-INV-INT-P03: order is created when quantity is within stock
 *
 * NEGATIVE CASES (2 tests):
 *   - ORD-INV-INT-N01: cart rejects quantity above available stock
 *   - ORD-INV-INT-N02: zero stock blocks adding and checkout
 *
 * EDGE CASES (2 tests):
 *   - ORD-INV-INT-E01: concurrent orders cannot oversell inventory
 *   - ORD-INV-INT-E02: checkout revalidates stale cart against current stock
 *
 * Business Rules Tested:
 * ----------------------
 * - Integration Point: Order service <-> Inventory service
 * - Deduction Rule: successful order deducts stock atomically
 * - Validation Rule: cart and checkout both enforce stock constraints
 * - Concurrency Rule: only one of competing oversubscribed orders succeeds
 * - Consistency Rule: deducted amount equals purchased quantity
 *
 * =============================================================================
 */

type ProductDetailResponse = {
  ok: boolean;
  product: {
    id: number;
    name: string;
    stock: number;
    price: string | number;
  };
};

type CartMutationResponse = {
  status?: 'success' | 'error';
  message?: string;
  totalItems?: number;
};

type OrderCreateResponse = {
  status?: 'success' | 'error';
  orderId?: string;
  message?: string;
  error?: {
    message?: string;
  };
};

const FIXED_STOCK = 20;
const productId = seededProducts[0].id;

const extractMessage = (body: CartMutationResponse | OrderCreateResponse): string => {
  if (typeof body.message === 'string') return body.message;
  if ('error' in body && typeof body.error?.message === 'string') return body.error.message;
  return '';
};

const getProductStock = async (api: APIRequestContext, id: number): Promise<number> => {
  const res = await api.get(routes.api.productDetail(id), {
    headers: { Accept: 'application/json' }
  });
  expect(res.status()).toBe(200);

  const body = (await res.json()) as ProductDetailResponse;
  expect(body.ok).toBe(true);
  expect(body.product.id).toBe(id);
  expect(typeof body.product.stock).toBe('number');
  return body.product.stock;
};

const addToCartRaw = async (api: APIRequestContext, id: number, quantity: number) => {
  const res = await api.post(routes.api.cartAdd, {
    data: { productId: id, quantity },
    headers: { Accept: 'application/json' },
    maxRedirects: 0
  });

  const body = (await res.json().catch(() => ({}))) as CartMutationResponse;
  return { status: res.status(), body };
};

const createOrderFromCart = async (api: APIRequestContext) => {
  const res = await api.post(routes.api.orderCreate, {
    data: { items: [] },
    headers: { Accept: 'application/json' },
    maxRedirects: 0
  });

  const body = (await res.json().catch(() => ({}))) as OrderCreateResponse;
  return { status: res.status(), body };
};

test.describe('order to inventory integration @integration @orders @inventory', () => {
  test.beforeAll(async () => {
    await disableChaos();
  });

  test.beforeEach(async ({ api }) => {
    await ensureProductStock(api, productId, FIXED_STOCK);
    await loginAsUser(api);
    await seedCart(api, []);
  });

  test.describe('positive cases', () => {
    test('ORD-INV-INT-P01: stock decreases after successful order @integration @orders @smoke @destructive', async ({ api }) => {
      const stockBefore = await getProductStock(api, productId);
      expect(stockBefore).toBe(FIXED_STOCK);

      await seedCart(api, [{ id: productId, quantity: 1 }]);

      const order = await createOrderFromCart(api);
      expect(order.status).toBe(200);
      expect(order.body.status).toBe('success');
      expect(order.body.orderId).toMatch(/^ORD-/);

      const stockAfter = await getProductStock(api, productId);
      expect(stockAfter).toBe(stockBefore - 1);
    });

    test('ORD-INV-INT-P02: stock reduction equals ordered quantity @integration @orders @regression @destructive', async ({ api }) => {
      const orderQuantity = 3;
      const stockBefore = await getProductStock(api, productId);
      expect(stockBefore).toBeGreaterThanOrEqual(orderQuantity);

      await seedCart(api, [{ id: productId, quantity: orderQuantity }]);

      const order = await createOrderFromCart(api);
      expect(order.status).toBe(200);
      expect(order.body.status).toBe('success');

      const stockAfter = await getProductStock(api, productId);
      expect(stockAfter).toBe(stockBefore - orderQuantity);
    });

    test('ORD-INV-INT-P03: order is created when quantity is within stock @integration @orders @regression @destructive', async ({ api }) => {
      const stockBefore = await getProductStock(api, productId);
      expect(stockBefore).toBeGreaterThan(0);

      await seedCart(api, [{ id: productId, quantity: stockBefore }]);

      const order = await createOrderFromCart(api);
      expect(order.status).toBe(200);
      expect(order.body.status).toBe('success');
      expect(order.body.orderId).toBeTruthy();

      const stockAfter = await getProductStock(api, productId);
      expect(stockAfter).toBe(0);
    });
  });

  test.describe('negative cases', () => {
    test('ORD-INV-INT-N01: cart rejects quantity above available stock @integration @orders @regression @destructive', async ({ api }) => {
      const currentStock = await getProductStock(api, productId);
      const excessiveQuantity = currentStock + 1;

      const add = await addToCartRaw(api, productId, excessiveQuantity);
      expect(add.status).toBe(400);
      expect(add.body.status).toBe('error');
      expect(extractMessage(add.body).toLowerCase()).toContain('stock');
    });

    test('ORD-INV-INT-N02: zero stock blocks adding and checkout @integration @orders @regression @destructive', async ({ api }) => {
      const currentStock = await getProductStock(api, productId);
      expect(currentStock).toBeGreaterThan(0);

      await seedCart(api, [{ id: productId, quantity: currentStock }]);

      const depletionOrder = await createOrderFromCart(api);
      expect(depletionOrder.status).toBe(200);
      expect(depletionOrder.body.status).toBe('success');
      expect(await getProductStock(api, productId)).toBe(0);

      const addAfterDepletion = await addToCartRaw(api, productId, 1);
      expect(addAfterDepletion.status).toBe(400);
      expect(addAfterDepletion.body.status).toBe('error');

      const orderAfterDepletion = await createOrderFromCart(api);
      expect(orderAfterDepletion.status).toBe(400);
      expect(orderAfterDepletion.body.status).toBe('error');
      expect(extractMessage(orderAfterDepletion.body)).toMatch(/cart is empty/i);
    });
  });

  test.describe('edge cases', () => {
    test('ORD-INV-INT-E01: concurrent orders cannot oversell inventory @integration @orders @regression @destructive', async ({ api }) => {
      const stockBefore = await getProductStock(api, productId);
      expect(stockBefore).toBeGreaterThan(1);

      const quantityPerUser = Math.floor(stockBefore / 2) + 1;
      const userA = await createIsolatedUserContext({ prefix: 'ordinv', label: 'a' });
      const userB = await createIsolatedUserContext({ prefix: 'ordinv', label: 'b' });

      try {
        await Promise.all([
          seedCart(userA, [{ id: productId, quantity: quantityPerUser }]),
          seedCart(userB, [{ id: productId, quantity: quantityPerUser }])
        ]);

        const [orderA, orderB] = await Promise.all([
          createOrderFromCart(userA),
          createOrderFromCart(userB)
        ]);

        const statuses = [orderA.status, orderB.status];
        const successCount = statuses.filter((status) => status === 200).length;
        const failureCount = statuses.filter((status) => status === 400).length;

        expect(successCount).toBe(1);
        expect(failureCount).toBe(1);

        const failedOrder = [orderA, orderB].find((order) => order.status !== 200);
        expect(failedOrder?.body.status).toBe('error');
        expect(extractMessage(failedOrder?.body ?? {})).toMatch(/only|remain|stock/i);

        const stockAfter = await getProductStock(api, productId);
        expect(stockAfter).toBe(stockBefore - quantityPerUser);
      } finally {
        await userA.dispose();
        await userB.dispose();
      }
    });

    test('ORD-INV-INT-E02: checkout revalidates stale cart against current stock @integration @orders @regression @destructive', async ({ api }) => {
      const stockBefore = await getProductStock(api, productId);
      expect(stockBefore).toBeGreaterThan(1);

      const userA = await createIsolatedUserContext({ prefix: 'ordinv', label: 'a-stale' });
      const userB = await createIsolatedUserContext({ prefix: 'ordinv', label: 'b-fresh' });

      try {
        await seedCart(userA, [{ id: productId, quantity: stockBefore }]);
        await seedCart(userB, [{ id: productId, quantity: 1 }]);

        const freshOrder = await createOrderFromCart(userB);
        expect(freshOrder.status).toBe(200);
        expect(freshOrder.body.status).toBe('success');

        const staleOrder = await createOrderFromCart(userA);
        expect(staleOrder.status).toBe(400);
        expect(staleOrder.body.status).toBe('error');
        expect(extractMessage(staleOrder.body)).toMatch(/only|remain|stock/i);

        const stockAfter = await getProductStock(api, productId);
        expect(stockAfter).toBe(stockBefore - 1);
      } finally {
        await userA.dispose();
        await userB.dispose();
      }
    });
  });
});
