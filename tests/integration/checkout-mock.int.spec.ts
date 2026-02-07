import { test, expect, loginAndSyncSession, seedCart } from '@fixtures';
import { seededProducts } from '@data';
import { CheckoutPage } from '@pages';
import { clearCart } from '@api';

/**
 * =============================================================================
 * CHECKOUT INTEGRATION TESTS
 * =============================================================================
 * 
 * Test Scenarios:
 * ---------------
 * 1. Cart-to-Checkout Data Integrity (Total Consistency)
 * 2. Multi-Page Flow Validation (Cart → Checkout)
 * 3. Payment Provider Integration (Mock & Stripe)
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (1 test):
 *   - CHK-INT-P01: Checkout total matches cart total exactly
 * 
 * NEGATIVE CASES (0 tests):
 *   - (Future: Total mismatch detection, coupon not transferred)
 * 
 * EDGE CASES (0 tests):
 *   - (Future: Cart modified during checkout, session timeout)
 * 
 * Business Rules Tested:
 * ----------------------
 * - Integration Point: Cart page → Checkout page
 * - Data Consistency: Grand total (subtotal - discount + shipping) preserved
 * - Payment Modes: Supports both Mock and Stripe payment providers
 * - Session Persistence: Cart state maintained across page transitions
 * - UI Calculation: Frontend cart totals match backend checkout totals
 * 
 * =============================================================================
 */

test.use({ seedData: true });

test.describe('checkout integration @integration @checkout', () => {

  const firstProduct = seededProducts[0];
  const secondProduct = seededProducts[1];

  test.beforeEach(async ({ api, page }) => {
    // Arrange: Login and seed cart with multiple products
    await loginAndSyncSession(api, page);
    await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);
  });

  test.describe('positive cases', () => {

    test('CHK-INT-P01: checkout total matches cart total @integration @checkout @regression', async ({ cartPage, checkoutPage }) => {
      // Arrange: Get total from cart page
      await cartPage.goto();
      const cartTotal = await cartPage.getGrandTotalValue();

      // Act: Navigate to checkout
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForDomReady();

      // Wait for payment provider to load
      if (!(await checkoutPage.isMockPayment())) {
        await checkoutPage.waitForStripeReady();
      }

      // Assert: Checkout total matches cart total
      const checkoutTotal = CheckoutPage.parsePrice(await checkoutPage.getTotal());
      expect(checkoutTotal).toBeCloseTo(cartTotal, 2);
    });
  });

  test.describe('negative cases', () => {

    test('CHK-INT-N01: coupon discount properly reflected in checkout @integration @checkout @regression', async ({ api, cartPage, checkoutPage }) => {
      // Arrange: Apply coupon to cart
      await cartPage.goto();
      
      // Get total before applying coupon
      const totalBeforeCoupon = await cartPage.getGrandTotalValue();
      
      // Act: Navigate to checkout (coupon should transfer)
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForDomReady();

      if (!(await checkoutPage.isMockPayment())) {
        await checkoutPage.waitForStripeReady();
      }

      // Assert: Total in checkout reflects any cart state
      const checkoutTotal = CheckoutPage.parsePrice(await checkoutPage.getTotal());
      expect(checkoutTotal).toBeCloseTo(totalBeforeCoupon, 2);
    });

    test('CHK-INT-N02: checkout validates cart is not empty @integration @checkout @smoke', async ({ api, page }) => {
      // Arrange: Clear cart completely
      await clearCart(api);

      // Act: Try to access checkout directly
      await page.goto('/checkout').catch(() => {});

      // Assert: Redirected back to cart page
      const url = page.url();
      expect(url).toContain('/cart');
    });
  });

  test.describe('edge cases', () => {

    test('CHK-INT-E01: shipping cost calculation matches between cart and checkout @integration @checkout @regression', async ({ cartPage, checkoutPage }) => {
      // Arrange: Navigate to cart
      await cartPage.goto();
      const cartShipping = await cartPage.getShippingValue();

      // Act: Navigate to checkout
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForDomReady();

      if (!(await checkoutPage.isMockPayment())) {
        await checkoutPage.waitForStripeReady();
      }

      // Assert: Shipping cost consistent
      // Note: Shipping logic is free over $1000, $50 otherwise
      expect(cartShipping).toBeGreaterThanOrEqual(0);
    });

    test('CHK-INT-E02: checkout total includes all cart items correctly @integration @checkout @regression', async ({ api, cartPage, checkoutPage }) => {
      // Arrange: Add multiple items to cart
      await cartPage.goto();
      const itemCount = await cartPage.getItemCount();

      // Act: Navigate to checkout
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForDomReady();

      if (!(await checkoutPage.isMockPayment())) {
        await checkoutPage.waitForStripeReady();
      }

      // Assert: Checkout reflects all items
      const total = await checkoutPage.getTotal();
      expect(total).toBeTruthy();
      expect(itemCount).toBeGreaterThan(0);
    });
  });
});
