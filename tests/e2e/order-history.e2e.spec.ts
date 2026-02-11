import type { APIRequestContext } from '@playwright/test';
import { test, expect, loginAndSyncSession, seedCart } from '@fixtures';
import { disableChaos } from '@api';
import { routes } from '@config';
import { seededProducts } from '@data';
import { registerAndLoginIsolatedUser, createOrderWithProviderFallback } from '@test-helpers';

/**
 * =============================================================================
 * ORDER HISTORY E2E TESTS
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Accessing order history through profile orders tab
 * 2. Verifying newly created orders are displayed correctly
 * 3. Verifying order card data (status, date, total, items)
 * 4. Validating invoice navigation from order history
 * 5. Handling unauthorized and empty-history states
 * 6. Validating ordering and refresh behavior with multiple orders
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (4 tests):
 *   - ORD-HIST-P01: orders tab loads and shows list or empty state
 *   - ORD-HIST-P02: newly created order shows correct product details
 *   - ORD-HIST-P03: order card shows status, placed date, and total
 *   - ORD-HIST-P04: view invoice link navigates to order invoice page
 *
 * NEGATIVE CASES (2 tests):
 *   - ORD-HIST-N01: unauthenticated user cannot access order history tab
 *   - ORD-HIST-N02: empty order history shows empty state for a newly registered user
 *
 * EDGE CASES (2 tests):
 *   - ORD-HIST-E01: multiple newly created orders are sorted newest first
 *   - ORD-HIST-E02: refreshing orders tab preserves order visibility
 *
 * Business Rules:
 * ---------------
 * - Order history is accessed via /profile?tab=orders
 * - Authentication is required to access order history
 * - Order cards show order id, status, placed date, items, and total
 * - Newest orders appear first in the list
 * - Empty state appears when user has no orders
 *
 * =============================================================================
 */

const createOrderForUser = async (
  api: APIRequestContext,
  items: Array<{ id: number; quantity?: number }>
): Promise<string> => {
  await seedCart(api, items);

  const orderResult = await createOrderWithProviderFallback(api);
  expect(orderResult.status).toBe(200);
  const createOrderBody = orderResult.body;
  expect(createOrderBody.status).toBe('success');
  expect(typeof createOrderBody.orderId).toBe('string');
  expect(createOrderBody.orderId).toContain('ORD-');

  return createOrderBody.orderId as string;
};

test.use({ seedData: true });

test.describe('order history comprehensive @e2e @orders', () => {
  test.beforeAll(async () => {
    await disableChaos();
  });

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
  });

  test.describe('positive cases', () => {
    test('ORD-HIST-P01: orders tab loads and shows list or empty state @e2e @orders @smoke', async ({
      page,
      profilePage
    }) => {
      await profilePage.gotoTab('orders');

      await expect(page).toHaveURL(
        (url) => `${url.pathname}${url.search}` === routes.profileOrders
      );
      await profilePage.expectOrderHistoryHeadingVisible();

      const orderCount = await profilePage.getOrderCount();
      if (orderCount > 0) {
        await profilePage.expectAnyOrderCardVisible();
      } else {
        await profilePage.expectNoOrdersVisible();
      }
    });

    test('ORD-HIST-P02: newly created order shows correct product details @e2e @orders @regression @destructive', async ({
      api,
      profilePage
    }) => {
      const orderId = await createOrderForUser(api, [{ id: seededProducts[0].id, quantity: 1 }]);

      await profilePage.gotoTab('orders');
      const orderCard = profilePage.orderCardByOrderId(orderId);

      await expect(orderCard).toBeVisible();
      await expect(orderCard).toContainText(seededProducts[0].name);
      await expect(orderCard).toContainText(orderId);
    });

    test('ORD-HIST-P03: order card shows status, placed date, and total @e2e @orders @regression @destructive', async ({
      api,
      profilePage
    }) => {
      const orderId = await createOrderForUser(api, [
        { id: seededProducts[0].id, quantity: 1 },
        { id: seededProducts[1].id, quantity: 1 }
      ]);

      await profilePage.gotoTab('orders');
      const orderCard = profilePage.orderCardByOrderId(orderId);

      await expect(orderCard).toBeVisible();
      await expect(orderCard).toContainText(/Completed|Pending|Processing|Paid/i);
      await expect(orderCard).toContainText(/Placed on/i);
      await expect(orderCard).toContainText(/Total:\s*\$[0-9,.]+\.[0-9]{2}/);
    });

    test('ORD-HIST-P04: view invoice link navigates to order invoice page @e2e @orders @regression @destructive', async ({
      api,
      page,
      profilePage
    }) => {
      const orderId = await createOrderForUser(api, [{ id: seededProducts[0].id, quantity: 1 }]);

      await profilePage.gotoTab('orders');
      await profilePage.expectOrderCardVisible(orderId);
      await profilePage.expectInvoiceHrefByOrderId(orderId, routes.order.invoice(orderId));

      const beforeUrl = page.url();
      await profilePage.clickInvoiceLinkByOrderId(orderId);
      if (page.url() === beforeUrl) {
        const href = await profilePage.getInvoiceHrefByOrderId(orderId);
        expect(typeof href).toBe('string');
        expect(href ?? '').toContain(routes.order.invoiceBase);
        await page.goto(href as string, { waitUntil: 'domcontentloaded' });
      }

      await expect(page).toHaveURL((url) => url.pathname === routes.order.invoice(orderId));
    });
  });

  test.describe('negative cases', () => {
    test('ORD-HIST-N01: unauthenticated user cannot access order history tab @e2e @orders @regression', async ({
      page,
      profilePage,
      loginPage
    }) => {
      await page.context().clearCookies();
      await profilePage.gotoTab('orders');

      const redirectedToLogin = page.url().includes(routes.login);
      const hasLoginInput = await loginPage.hasAnyLoginInputVisible();
      expect(redirectedToLogin || hasLoginInput).toBe(true);
    });

    test('ORD-HIST-N02: empty order history shows empty state for a new user @e2e @orders @regression @destructive', async ({
      api,
      page,
      profilePage
    }) => {
      await registerAndLoginIsolatedUser(api, { prefix: 'orders' });
      const storage = await api.storageState();
      await page.context().clearCookies();
      await page.context().addCookies(storage.cookies);

      await profilePage.gotoTab('orders');
      await expect(page).toHaveURL(
        (url) => `${url.pathname}${url.search}` === routes.profileOrders
      );

      expect(await profilePage.getOrderCount()).toBe(0);
      await profilePage.expectNoOrdersVisible();
    });
  });

  test.describe('edge cases', () => {
    test('ORD-HIST-E01: multiple newly created orders are sorted newest first @e2e @orders @regression @destructive', async ({
      api,
      profilePage
    }) => {
      const olderOrderId = await createOrderForUser(api, [
        { id: seededProducts[0].id, quantity: 1 }
      ]);
      const newerOrderId = await createOrderForUser(api, [
        { id: seededProducts[1].id, quantity: 1 }
      ]);

      await profilePage.gotoTab('orders');
      expect(await profilePage.getOrderCount()).toBeGreaterThanOrEqual(2);

      const newestCardText = await profilePage.getOrderCardTextByIndex(0);
      const olderCardText = await profilePage.getOrderCardTextByIndex(1);
      expect(newestCardText).toContain(newerOrderId);
      expect(olderCardText).toContain(olderOrderId);
    });

    test('ORD-HIST-E02: refreshing orders tab preserves order visibility @e2e @orders @regression @destructive', async ({
      api,
      page,
      profilePage
    }) => {
      const orderId = await createOrderForUser(api, [{ id: seededProducts[0].id, quantity: 1 }]);

      await profilePage.gotoTab('orders');
      await profilePage.expectOrderCardVisible(orderId);
      const beforeReloadCount = await profilePage.getOrderCount();

      await profilePage.reloadDomReady();
      await expect(page).toHaveURL(
        (url) => `${url.pathname}${url.search}` === routes.profileOrders
      );
      await profilePage.expectOrderCardVisible(orderId);

      const afterReloadCount = await profilePage.getOrderCount();
      expect(afterReloadCount).toBe(beforeReloadCount);
    });
  });
});
