import { test, expect, seedCart } from '@fixtures';
import { disableChaos, loginAsUser } from '@api';
import {
  ORDER_INVENTORY_FIXED_STOCK as FIXED_STOCK,
  orderInventoryProductId as productId
} from '@test-helpers/constants/inventory';
import {
  ensureProductStock,
  createIsolatedUserContext
} from '@test-helpers';
import {
  addToCartRaw,
  createOrderFromCart,
  expectOrderSuccess,
  expectStockError,
  extractMessage,
  getProductStock
} from '@test-helpers/helpers/orders';

/**
 * Overview: Integration tests for order placement impact on inventory consistency and concurrency.
 * Summary: Verifies stock deduction correctness, oversell prevention, stale-cart revalidation, and controlled errors on depleted stock.
 */

test.use({ seedData: true });

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
    test('ORD-INV-INT-P01: stock decreases after successful order @integration @orders @smoke @destructive', async ({
      api
    }) => {
      const stockBefore = await getProductStock(api, productId);
      expect(stockBefore).toBe(FIXED_STOCK);

      await seedCart(api, [{ id: productId, quantity: 1 }]);

      const order = await createOrderFromCart(api);
      expectOrderSuccess(order);
      expect(order.body.orderId).toMatch(/^ORD-/);

      const stockAfter = await getProductStock(api, productId);
      expect(stockAfter).toBe(stockBefore - 1);
    });

    test('ORD-INV-INT-P02: stock reduction equals ordered quantity @integration @orders @regression @destructive', async ({
      api
    }) => {
      const orderQuantity = 3;
      const stockBefore = await getProductStock(api, productId);
      expect(stockBefore).toBeGreaterThanOrEqual(orderQuantity);

      await seedCart(api, [{ id: productId, quantity: orderQuantity }]);

      const order = await createOrderFromCart(api);
      expectOrderSuccess(order);

      const stockAfter = await getProductStock(api, productId);
      expect(stockAfter).toBe(stockBefore - orderQuantity);
    });

    test('ORD-INV-INT-P03: order is created when quantity is within stock @integration @orders @regression @destructive', async ({
      api
    }) => {
      const stockBefore = await getProductStock(api, productId);
      expect(stockBefore).toBeGreaterThan(0);

      await seedCart(api, [{ id: productId, quantity: stockBefore }]);

      const order = await createOrderFromCart(api);
      expectOrderSuccess(order);
      expect(order.body.orderId).toBeTruthy();

      const stockAfter = await getProductStock(api, productId);
      expect(stockAfter).toBe(0);
    });
  });

  test.describe('negative cases', () => {
    test('ORD-INV-INT-N01: cart rejects quantity above available stock @integration @orders @regression @destructive', async ({
      api
    }) => {
      const currentStock = await getProductStock(api, productId);
      const excessiveQuantity = currentStock + 1;

      const add = await addToCartRaw(api, productId, excessiveQuantity);
      expect(add.status).toBe(400);
      expect(add.body.status).toBe('error');
      expect(extractMessage(add.body).toLowerCase()).toContain('stock');
    });

    test('ORD-INV-INT-N02: zero stock blocks adding and checkout @integration @orders @regression @destructive', async ({
      api
    }) => {
      const currentStock = await getProductStock(api, productId);
      expect(currentStock).toBeGreaterThan(0);

      await seedCart(api, [{ id: productId, quantity: currentStock }]);

      const depletionOrder = await createOrderFromCart(api);
      expectOrderSuccess(depletionOrder);
      expect(await getProductStock(api, productId)).toBe(0);

      const addAfterDepletion = await addToCartRaw(api, productId, 1);
      expect(addAfterDepletion.status).toBe(400);
      expect(addAfterDepletion.body.status).toBe('error');

      const orderAfterDepletion = await createOrderFromCart(api);
      expectStockError(orderAfterDepletion);
    });
  });

  test.describe('edge cases', () => {
    test('ORD-INV-INT-E01: concurrent orders cannot oversell inventory @integration @orders @regression @destructive', async ({
      api
    }) => {
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
        expect(extractMessage(failedOrder?.body ?? {})).toMatch(/only|remain|stock|cart is empty/i);

        const stockAfter = await getProductStock(api, productId);
        expect(stockAfter).toBe(stockBefore - quantityPerUser);
      } finally {
        await userA.dispose();
        await userB.dispose();
      }
    });

    test('ORD-INV-INT-E02: checkout revalidates stale cart against current stock @integration @orders @regression @destructive', async ({
      api
    }) => {
      const stockBefore = await getProductStock(api, productId);
      expect(stockBefore).toBeGreaterThan(1);

      const userA = await createIsolatedUserContext({ prefix: 'ordinv', label: 'a-stale' });
      const userB = await createIsolatedUserContext({ prefix: 'ordinv', label: 'b-fresh' });

      try {
        await seedCart(userA, [{ id: productId, quantity: stockBefore }]);
        await seedCart(userB, [{ id: productId, quantity: 1 }]);

        const freshOrder = await createOrderFromCart(userB);
        expectOrderSuccess(freshOrder);

        const staleOrder = await createOrderFromCart(userA);
        expectStockError(staleOrder);

        const stockAfter = await getProductStock(api, productId);
        expect(stockAfter).toBe(stockBefore - 1);
      } finally {
        await userA.dispose();
        await userB.dispose();
      }
    });
  });
});



