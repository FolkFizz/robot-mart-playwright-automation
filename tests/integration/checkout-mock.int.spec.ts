import { test, expect, loginAndSyncSession, seedCart } from '@fixtures';
import { seededProducts } from '@data';
import { CheckoutPage } from '@pages';

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

test.describe('checkout integration @integration @checkout', () => {
  test.use({ seedData: true });

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

  // Future test cases:
  // test.describe('edge cases', () => {
  //   test('CHK-INT-E01: cart modified during checkout shows warning', async () => {});
  // });
});
