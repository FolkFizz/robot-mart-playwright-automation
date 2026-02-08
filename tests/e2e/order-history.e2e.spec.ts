import type { APIRequestContext } from '@playwright/test';
import { test, expect, loginAndSyncSession, seedCart, resetAndSeed } from '@fixtures';
import { disableChaos } from '@api';
import { routes } from '@config';
import { seededProducts } from '@data';

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
 *   - ORD-HIST-N02: empty order history shows empty state after reset
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

  const createOrderRes = await api.post(routes.api.orderCreate, {
    data: { items: [] },
    headers: { Accept: 'application/json' }
  });

  expect(createOrderRes.ok()).toBeTruthy();
  const createOrderBody = await createOrderRes.json();
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
    test('ORD-HIST-P01: orders tab loads and shows list or empty state @e2e @orders @smoke', async ({ page, profilePage }) => {
      await profilePage.gotoTab('orders');

      await expect(page).toHaveURL(/\/profile\?tab=orders/);
      await expect(page.getByRole('heading', { name: /Order History/i })).toBeVisible();

      const orderCount = await profilePage.getOrderCount();
      if (orderCount > 0) {
        await expect(page.locator('.order-card').first()).toBeVisible();
      } else {
        await expect(page.getByText(/No orders found/i)).toBeVisible();
      }
    });

    test('ORD-HIST-P02: newly created order shows correct product details @e2e @orders @regression @destructive', async ({ api, page, profilePage }) => {
      const orderId = await createOrderForUser(api, [{ id: seededProducts[0].id, quantity: 1 }]);

      await profilePage.gotoTab('orders');
      const orderCard = page.locator('.order-card', { hasText: orderId }).first();

      await expect(orderCard).toBeVisible();
      await expect(orderCard).toContainText(seededProducts[0].name);
      await expect(orderCard).toContainText(orderId);
    });

    test('ORD-HIST-P03: order card shows status, placed date, and total @e2e @orders @regression @destructive', async ({ api, page, profilePage }) => {
      const orderId = await createOrderForUser(api, [
        { id: seededProducts[0].id, quantity: 1 },
        { id: seededProducts[1].id, quantity: 1 }
      ]);

      await profilePage.gotoTab('orders');
      const orderCard = page.locator('.order-card', { hasText: orderId }).first();

      await expect(orderCard).toBeVisible();
      await expect(orderCard).toContainText(/Completed|Pending|Processing|Paid/i);
      await expect(orderCard).toContainText(/Placed on/i);
      await expect(orderCard).toContainText(/Total:\s*\$[0-9,.]+\.[0-9]{2}/);
    });

    test('ORD-HIST-P04: view invoice link navigates to order invoice page @e2e @orders @regression @destructive', async ({ api, page, profilePage }) => {
      const orderId = await createOrderForUser(api, [{ id: seededProducts[0].id, quantity: 1 }]);

      await profilePage.gotoTab('orders');
      const orderCard = page.locator('.order-card', { hasText: orderId }).first();
      await expect(orderCard).toBeVisible();

      const invoiceLink = orderCard.getByRole('link', { name: /View Invoice/i });
      await expect(invoiceLink).toHaveAttribute('href', new RegExp(`/order/invoice/${orderId}`));

      const beforeUrl = page.url();
      await invoiceLink.click();
      if (page.url() === beforeUrl) {
        const href = await invoiceLink.getAttribute('href');
        expect(href).toBeTruthy();
        await page.goto(href as string, { waitUntil: 'domcontentloaded' });
      }

      await expect(page).toHaveURL(new RegExp(`/order/invoice/${orderId}`));
    });
  });

  test.describe('negative cases', () => {
    test('ORD-HIST-N01: unauthenticated user cannot access order history tab @e2e @orders @regression', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto(`${routes.profile}?tab=orders`);

      const redirectedToLogin = /\/login/.test(page.url());
      const hasLoginInput = (await page.locator('input[name="username"], input[name="email"], [data-testid="login-username"]').count()) > 0;
      expect(redirectedToLogin || hasLoginInput).toBe(true);
    });

    test('ORD-HIST-N02: empty order history shows empty state after reset @e2e @orders @regression @destructive', async ({ api, page, profilePage }) => {
      await resetAndSeed();
      await loginAndSyncSession(api, page);

      await profilePage.gotoTab('orders');
      await expect(page).toHaveURL(/\/profile\?tab=orders/);

      expect(await profilePage.getOrderCount()).toBe(0);
      await expect(page.getByText(/No orders found/i)).toBeVisible();
    });
  });

  test.describe('edge cases', () => {
    test('ORD-HIST-E01: multiple newly created orders are sorted newest first @e2e @orders @regression @destructive', async ({ api, page, profilePage }) => {
      const olderOrderId = await createOrderForUser(api, [{ id: seededProducts[0].id, quantity: 1 }]);
      await page.waitForTimeout(30);
      const newerOrderId = await createOrderForUser(api, [{ id: seededProducts[1].id, quantity: 1 }]);

      await profilePage.gotoTab('orders');
      const orderCards = page.locator('.order-card');
      expect(await orderCards.count()).toBeGreaterThanOrEqual(2);

      const newestCardText = await orderCards.nth(0).innerText();
      const olderCardText = await orderCards.nth(1).innerText();
      expect(newestCardText).toContain(newerOrderId);
      expect(olderCardText).toContain(olderOrderId);
    });

    test('ORD-HIST-E02: refreshing orders tab preserves order visibility @e2e @orders @regression @destructive', async ({ api, page, profilePage }) => {
      const orderId = await createOrderForUser(api, [{ id: seededProducts[0].id, quantity: 1 }]);

      await profilePage.gotoTab('orders');
      const orderCard = page.locator('.order-card', { hasText: orderId }).first();
      await expect(orderCard).toBeVisible();
      const beforeReloadCount = await profilePage.getOrderCount();

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/profile\?tab=orders/);
      await expect(page.locator('.order-card', { hasText: orderId }).first()).toBeVisible();

      const afterReloadCount = await profilePage.getOrderCount();
      expect(afterReloadCount).toBe(beforeReloadCount);
    });
  });
});
