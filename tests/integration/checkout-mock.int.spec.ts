import type { APIRequestContext, Page, TestInfo } from '@playwright/test';
import { test, expect, seedCart } from '@fixtures';
import { seededProducts, coupons, buildTestEmail, isolatedUserPassword } from '@data';
import { CartPage, CheckoutPage } from '@pages';
import { addToCart, applyCoupon, clearCart, disableChaos } from '@api';
import { routes, SHIPPING } from '@config';

/**
 * =============================================================================
 * CHECKOUT INTEGRATION TESTS
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Cart-to-checkout data integrity (totals, shipping, discounts)
 * 2. Multi-page flow validation (cart changes, session, empty-cart guards)
 * 3. Payment mode bootstrap (mock vs stripe rendering)
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (2 tests):
 *   - CHK-INT-P01: checkout total matches cart grand total
 *   - CHK-INT-P02: checkout initializes payment UI for active provider
 *
 * NEGATIVE CASES (3 tests):
 *   - CHK-INT-N01: checkout blocks empty cart access
 *   - CHK-INT-N02: cart cleared during checkout is blocked on refresh
 *   - CHK-INT-N03: expired coupon does not change checkout total
 *
 * EDGE CASES (5 tests):
 *   - CHK-INT-E01: below-threshold order keeps shipping fee in checkout
 *   - CHK-INT-E02: high-value order keeps free shipping in checkout
 *   - CHK-INT-E03: valid coupon discount persists from cart to checkout
 *   - CHK-INT-E04: cart quantity updates propagate to checkout total
 *   - CHK-INT-E05: session expiry redirects away from checkout
 *
 * Business Rules Tested:
 * ----------------------
 * - Integration Point: Cart page -> Checkout page
 * - Grand Total Formula: Subtotal + Discount + Shipping
 * - Shipping Rule: FREE if (Subtotal + Discount) >= threshold, else shipping fee
 * - Data Consistency: Cart totals must match checkout totals
 * - State Propagation: Cart mutations must be reflected at checkout
 * - Access Guard: Empty cart and expired session must not proceed to checkout
 *
 * =============================================================================
 */

const checkoutPathPattern = /\/order\/(checkout|place)/;
const emptyCartTextPatterns = [
  'cart is empty',
  'your cart is empty',
  'empty cart',
  'no items in cart',
  'go add some bots'
];

const syncSessionFromApi = async (api: APIRequestContext, page: Page): Promise<void> => {
  const storage = await api.storageState();
  await page.context().addCookies(storage.cookies);
};

const registerAndLoginIsolatedUser = async (
  api: APIRequestContext,
  page: Page,
  testInfo: TestInfo
): Promise<void> => {
  const project = testInfo.project.name.replace(/[^a-z0-9]/gi, '').toLowerCase();
  const token = `${Date.now()}_${testInfo.workerIndex}_${Math.random().toString(36).slice(2, 8)}`;
  const username = `int_${project}_${token}`;
  const email = buildTestEmail(username);
  const password = isolatedUserPassword;

  const registerRes = await api.post(routes.register, {
    form: { username, email, password, confirmPassword: password },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  expect([200, 302, 303]).toContain(registerRes.status());

  const loginRes = await api.post(routes.login, {
    form: { username, password },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  expect([200, 302, 303]).toContain(loginRes.status());

  await syncSessionFromApi(api, page);
};

const gotoCheckoutFromCart = async (page: Page, cartPage: CartPage, checkoutPage: CheckoutPage): Promise<void> => {
  await cartPage.goto();
  await cartPage.proceedToCheckoutWithFallback();

  if (!checkoutPathPattern.test(page.url())) {
    await checkoutPage.goto();
  }

  await expect(page).toHaveURL(checkoutPathPattern);
};

const waitForCheckoutReady = async (checkoutPage: CheckoutPage): Promise<'mock' | 'stripe'> => {
  await checkoutPage.waitForDomReady();
  await checkoutPage.expectSubmitVisible();

  if (await checkoutPage.isMockPayment()) return 'mock';

  if ((await checkoutPage.getStripeFrameCount()) > 0) {
    expect(await checkoutPage.isStripeFrameVisible()).toBe(true);
    return 'stripe';
  }

  await checkoutPage.expectPaymentElementVisible();
  return 'stripe';
};

const hasEmptyCartGuard = async (checkoutPage: CheckoutPage): Promise<boolean> => {
  return await checkoutPage.hasEmptyCartGuard(emptyCartTextPatterns);
};

test.use({ seedData: true });

test.describe('checkout integration @integration @checkout', () => {
  const firstProduct = seededProducts[0];
  const secondProduct = seededProducts[1];
  const thirdProduct = seededProducts[2];

  test.beforeAll(async () => {
    await disableChaos();
  });

  test.beforeEach(async ({ api, page }, testInfo) => {
    await registerAndLoginIsolatedUser(api, page, testInfo);
    await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);
    await syncSessionFromApi(api, page);
  });

  test.describe('positive cases', () => {
    test('CHK-INT-P01: checkout total matches cart grand total @integration @checkout @regression', async ({ page, cartPage, checkoutPage }) => {
      await cartPage.goto();
      const cartGrandTotal = await cartPage.getGrandTotalValue();

      await gotoCheckoutFromCart(page, cartPage, checkoutPage);
      await waitForCheckoutReady(checkoutPage);

      const checkoutTotal = CheckoutPage.parsePrice(await checkoutPage.getTotal());
      expect(checkoutTotal).toBeCloseTo(cartGrandTotal, 2);
    });

    test('CHK-INT-P02: checkout initializes payment UI for active provider @integration @checkout @smoke', async ({ page, cartPage, checkoutPage }) => {
      await gotoCheckoutFromCart(page, cartPage, checkoutPage);

      const providerMode = await waitForCheckoutReady(checkoutPage);
      expect(['mock', 'stripe']).toContain(providerMode);

      await expect(checkoutPage.getNameInput()).toBeVisible();
      await expect(checkoutPage.getEmailInput()).toBeVisible();
    });
  });

  test.describe('negative cases', () => {
    test('CHK-INT-N01: checkout blocks empty cart access @integration @checkout @smoke', async ({ api, page, checkoutPage }) => {
      await clearCart(api);
      await syncSessionFromApi(api, page);

      await checkoutPage.goto();
      const url = page.url();
      const redirectedToCart = url.includes(routes.cart);
      const stayedOnCheckout = checkoutPathPattern.test(url);
      const guarded = await hasEmptyCartGuard(checkoutPage);
      const paymentMessage = (await checkoutPage.getPaymentMessage().catch(() => '')).toLowerCase();
      const hasPaymentGuard = paymentMessage.includes('cart is empty');

      expect(redirectedToCart || (stayedOnCheckout && (guarded || hasPaymentGuard))).toBe(true);
    });

    test('CHK-INT-N02: cart cleared during checkout is blocked on refresh @integration @checkout @regression', async ({ api, page, cartPage, checkoutPage }) => {
      await gotoCheckoutFromCart(page, cartPage, checkoutPage);
      await waitForCheckoutReady(checkoutPage);

      await clearCart(api);
      await syncSessionFromApi(api, page);
      await checkoutPage.reloadDomReady();

      const url = page.url();
      const redirectedToCart = url.includes(routes.cart);
      const stayedOnCheckout = checkoutPathPattern.test(url);
      const guarded = await hasEmptyCartGuard(checkoutPage);

      expect(redirectedToCart || (stayedOnCheckout && guarded)).toBe(true);
    });

    test('CHK-INT-N03: expired coupon does not change checkout total @integration @checkout @regression', async ({ api, page, cartPage, checkoutPage }) => {
      await cartPage.goto();
      const totalBeforeCoupon = await cartPage.getGrandTotalValue();

      const couponRes = await api.post(routes.api.cartCoupons, {
        data: { code: coupons.expired50.code },
        headers: { Accept: 'application/json' }
      });
      expect(couponRes.status()).toBeLessThan(500);

      if (couponRes.status() === 200) {
        const body = await couponRes.json().catch(() => ({}));
        expect(body.status).toBe('error');
      } else {
        expect(couponRes.status()).toBeGreaterThanOrEqual(400);
      }

      await syncSessionFromApi(api, page);
      await cartPage.goto();
      const totalAfterCouponAttempt = await cartPage.getGrandTotalValue();
      expect(totalAfterCouponAttempt).toBeCloseTo(totalBeforeCoupon, 2);

      await gotoCheckoutFromCart(page, cartPage, checkoutPage);
      await waitForCheckoutReady(checkoutPage);

      const checkoutTotal = CheckoutPage.parsePrice(await checkoutPage.getTotal());
      expect(checkoutTotal).toBeCloseTo(totalBeforeCoupon, 2);
    });
  });

  test.describe('edge cases', () => {
    test('CHK-INT-E01: below-threshold order keeps shipping fee in checkout @integration @checkout @regression', async ({ api, page, cartPage, checkoutPage }) => {
      await seedCart(api, [{ id: firstProduct.id, quantity: 1 }]);
      await syncSessionFromApi(api, page);

      await cartPage.goto();
      const subtotal = await cartPage.getSubtotalValue();
      expect(subtotal).toBeLessThan(SHIPPING.freeThreshold);

      const shipping = await cartPage.getShippingValue();
      expect(shipping).toBe(SHIPPING.fee);

      const cartTotal = await cartPage.getGrandTotalValue();
      expect(cartTotal).toBeCloseTo(subtotal + shipping, 2);

      await gotoCheckoutFromCart(page, cartPage, checkoutPage);
      await waitForCheckoutReady(checkoutPage);

      const checkoutTotal = CheckoutPage.parsePrice(await checkoutPage.getTotal());
      expect(checkoutTotal).toBeCloseTo(cartTotal, 2);
    });

    test('CHK-INT-E02: high-value order keeps free shipping in checkout @integration @checkout @regression', async ({ api, page, cartPage, checkoutPage }) => {
      await seedCart(api, [{ id: thirdProduct.id, quantity: 2 }]);
      await syncSessionFromApi(api, page);

      await cartPage.goto();
      const subtotal = await cartPage.getSubtotalValue();
      expect(subtotal).toBeGreaterThanOrEqual(SHIPPING.freeThreshold);

      const shipping = await cartPage.getShippingValue();
      expect(shipping).toBe(0);

      const cartTotal = await cartPage.getGrandTotalValue();
      expect(cartTotal).toBeCloseTo(subtotal, 2);

      await gotoCheckoutFromCart(page, cartPage, checkoutPage);
      await waitForCheckoutReady(checkoutPage);

      const checkoutTotal = CheckoutPage.parsePrice(await checkoutPage.getTotal());
      expect(checkoutTotal).toBeCloseTo(cartTotal, 2);
    });

    test('CHK-INT-E03: valid coupon discount persists from cart to checkout @integration @checkout @regression', async ({ api, page, cartPage, checkoutPage }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);
      await applyCoupon(api, coupons.welcome10.code);
      await syncSessionFromApi(api, page);

      await cartPage.goto();
      const subtotal = await cartPage.getSubtotalValue();
      const discount = await cartPage.getDiscountValue();
      const shipping = await cartPage.getShippingValue();
      const cartTotal = await cartPage.getGrandTotalValue();

      expect(discount).toBeLessThan(0);
      expect(cartTotal).toBeCloseTo(subtotal + discount + shipping, 1);

      await gotoCheckoutFromCart(page, cartPage, checkoutPage);
      await waitForCheckoutReady(checkoutPage);

      const checkoutTotal = CheckoutPage.parsePrice(await checkoutPage.getTotal());
      expect(checkoutTotal).toBeCloseTo(cartTotal, 1);
    });

    test('CHK-INT-E04: cart quantity updates propagate to checkout total @integration @checkout @regression', async ({ api, page, cartPage, checkoutPage }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);
      await syncSessionFromApi(api, page);

      await cartPage.goto();
      const totalBeforeUpdate = await cartPage.getGrandTotalValue();

      await addToCart(api, secondProduct.id, 1);
      await syncSessionFromApi(api, page);

      await cartPage.goto();
      const totalAfterUpdate = await cartPage.getGrandTotalValue();
      expect(totalAfterUpdate).toBeGreaterThan(totalBeforeUpdate);

      await gotoCheckoutFromCart(page, cartPage, checkoutPage);
      await waitForCheckoutReady(checkoutPage);

      const checkoutTotal = CheckoutPage.parsePrice(await checkoutPage.getTotal());
      expect(checkoutTotal).toBeCloseTo(totalAfterUpdate, 2);
    });

    test('CHK-INT-E05: session expiry redirects away from checkout @integration @checkout @regression', async ({ page, cartPage, checkoutPage }) => {
      await gotoCheckoutFromCart(page, cartPage, checkoutPage);
      await waitForCheckoutReady(checkoutPage);

      await page.context().clearCookies();
      await checkoutPage.goto();

      expect(checkoutPathPattern.test(page.url())).toBe(false);
    });
  });
});
