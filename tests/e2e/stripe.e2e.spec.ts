import { test, expect, loginAndSyncSession, seedCart } from '@fixtures';
import { disableChaos, clearCart } from '@api';
import { routes } from '@config';
import { seededProducts } from '@data';
import type { Page } from '@playwright/test';
import { CheckoutPage, CartPage } from '@pages';

/**
 * =============================================================================
 * STRIPE CHECKOUT INTEGRATION TESTS
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Checkout + payment element bootstrapping
 * 2. Cart-to-checkout amount consistency
 * 3. Stripe SDK readiness and form controls
 * 4. Empty-cart and provider-mode fallback behavior
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (3 tests):
 *   - STRIPE-P01: checkout is reachable and payment section is initialized
 *   - STRIPE-P02: checkout total matches cart grand total
 *   - STRIPE-P03: Stripe SDK and payment frame load in stripe mode
 *
 * NEGATIVE CASES (2 tests):
 *   - STRIPE-N01: mock mode shows mock-payment note instead of Stripe
 *   - STRIPE-N02: empty cart blocks real payment entry on checkout
 *
 * EDGE CASES (2 tests):
 *   - STRIPE-E01: checkout total remains stable after page reload
 *   - STRIPE-E02: submit button status exists in both stripe and mock modes
 *
 * Business Rules Tested:
 * ----------------------
 * - Checkout is served at /order/checkout (/order/place redirects there)
 * - Cart grand total must equal checkout displayed total
 * - Stripe-specific assertions run only when provider is not mock
 * - Empty cart must not render active payment entry fields
 * - UI should stay stable across reloads and provider modes
 *
 * =============================================================================
 */

const gotoCheckoutFromCart = async (page: Page, cartPage: CartPage) => {
  await cartPage.goto();
  await cartPage.proceedToCheckoutWithFallback();
  await expect(page).toHaveURL(
    (url) => url.pathname === routes.order.checkout || url.pathname === routes.order.place
  );
};

test.use({ seedData: true });

test.describe('stripe checkout integration @e2e @checkout @stripe', () => {
  test.beforeAll(async () => {
    await disableChaos();
  });

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
    await seedCart(api, [{ id: seededProducts[0].id }]);
  });

  test.describe('positive cases', () => {
    test('STRIPE-P01: checkout is reachable and payment section is initialized @e2e @checkout @smoke', async ({
      page,
      cartPage,
      checkoutPage
    }) => {
      await gotoCheckoutFromCart(page, cartPage);

      await checkoutPage.expectSubmitVisible();
      if (await checkoutPage.isMockPayment()) {
        await checkoutPage.expectMockPaymentNoteVisible();
      } else {
        await checkoutPage.waitForStripeReady();
      }
    });

    test('STRIPE-P02: checkout total matches cart grand total @e2e @checkout @regression', async ({
      page,
      cartPage,
      checkoutPage
    }) => {
      await cartPage.goto();
      const cartTotal = await cartPage.getGrandTotalValue();

      await cartPage.proceedToCheckoutWithFallback();
      await expect(page).toHaveURL(
        (url) => url.pathname === routes.order.checkout || url.pathname === routes.order.place
      );

      const checkoutTotal = CheckoutPage.parsePrice(await checkoutPage.getTotal());
      expect(checkoutTotal).toBeCloseTo(cartTotal, 2);
    });

    test('STRIPE-P03: Stripe SDK and payment frame load in stripe mode @e2e @checkout @smoke', async ({
      page,
      cartPage,
      checkoutPage
    }) => {
      await gotoCheckoutFromCart(page, cartPage);

      if (await checkoutPage.isMockPayment()) {
        test.skip();
      }

      await checkoutPage.waitForStripeReady();

      const stripeLoaded = await checkoutPage.isStripeSdkLoaded();
      expect(stripeLoaded).toBe(true);

      const frameCount = await checkoutPage.getStripeFrameCount();
      expect(frameCount).toBeGreaterThan(0);
    });
  });

  test.describe('negative cases', () => {
    test('STRIPE-N01: mock mode shows mock-payment note instead of Stripe @e2e @checkout @regression', async ({
      page,
      cartPage,
      checkoutPage
    }) => {
      await gotoCheckoutFromCart(page, cartPage);

      const isMock = await checkoutPage.isMockPayment();
      if (isMock) {
        await checkoutPage.expectMockPaymentNoteVisible();
        await checkoutPage.expectPaymentElementCount(0);
      } else {
        await checkoutPage.waitForStripeReady();
        await checkoutPage.expectPaymentElementVisible();
      }
    });

    test('STRIPE-N02: empty cart blocks real payment entry on checkout @e2e @checkout @regression @destructive', async ({
      api,
      checkoutPage
    }) => {
      await clearCart(api);
      await checkoutPage.goto();

      const hasEmptyCartGuard = await checkoutPage.hasEmptyCartGuard([
        'cart is empty',
        'your cart is empty',
        'empty cart',
        'go shop'
      ]);

      expect(hasEmptyCartGuard).toBe(true);
      expect(await checkoutPage.getNameInputCount()).toBe(0);
      expect(await checkoutPage.getPaymentElementCount()).toBe(0);
      expect(await checkoutPage.getSubmitButtonCount()).toBe(0);
    });
  });

  test.describe('edge cases', () => {
    test('STRIPE-E01: checkout total remains stable after page reload @e2e @checkout @regression', async ({
      page,
      cartPage,
      checkoutPage
    }) => {
      await gotoCheckoutFromCart(page, cartPage);
      const beforeReload = CheckoutPage.parsePrice(await checkoutPage.getTotal());

      await checkoutPage.reloadDomReady();
      await expect(page).toHaveURL(
        (url) => url.pathname === routes.order.checkout || url.pathname === routes.order.place
      );
      const afterReload = CheckoutPage.parsePrice(await checkoutPage.getTotal());

      expect(afterReload).toBeCloseTo(beforeReload, 2);
    });

    test('STRIPE-E02: submit button status exists in both stripe and mock modes @e2e @checkout @regression', async ({
      page,
      cartPage,
      checkoutPage
    }) => {
      await gotoCheckoutFromCart(page, cartPage);

      if (!(await checkoutPage.isMockPayment())) {
        await checkoutPage.waitForStripeReady();
      }

      const status = await checkoutPage.getSubmitStatus();
      expect(status).not.toBeNull();
      expect(['idle', 'ready', 'loading', 'error', 'success']).toContain(status ?? 'idle');
    });
  });
});
