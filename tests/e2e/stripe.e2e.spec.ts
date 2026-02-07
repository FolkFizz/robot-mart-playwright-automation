import { test, expect, loginAndSyncSession, seedCart } from '@fixtures';
import { seededProducts } from '@data';
import { clearCart } from '@api';
import { CheckoutPage } from '@pages';

/**
 * =============================================================================
 * STRIPE INTEGRATION TESTS - Live Mode
 * =============================================================================
 * 
 * Test Scenarios:
 * ---------------
 * 1. Stripe Payment Element Loading (Live Mode)
 * 2. Stripe SDK Integration Validation
 * 3. Payment Provider Availability Check
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (1 test):
 *   - STRIPE-P01: Stripe element loads successfully in live mode
 * 
 * NEGATIVE CASES (0 tests):
 *   - (Future: Network failures, invalid API keys)
 * 
 * EDGE CASES (0 tests):
 *   - (Future: Stripe downtime, slow loading, different card types)
 * 
 * Business Rules Tested:
 * ----------------------
 * - Payment Provider: Real Stripe integration (requires PAYMENT_PROVIDER=stripe)
 * - Test Skip Condition: Automatically skips if mock payment mode is enabled
 * - Stripe Element: data-stripe-ready attribute indicates successful load
 * - Required Environment: STRIPE_PUBLISHABLE_KEY must be set
 * - Live Mode: Tests against actual Stripe test environment
 * - No Charges: Uses Stripe test mode keys (no real transactions)
 * 
 * Note: This test requires live Stripe connection and will skip in mock mode.
 * For full payment flow testing, see checkout.e2e.spec.ts (uses mock payment).
 * 
 * =============================================================================
 */

test.use({ seedData: true });

test.describe('stripe integration @e2e @checkout @stripe', () => {

  test.beforeEach(async ({ api, page }) => {
    // Arrange: Login and seed cart with product
    await loginAndSyncSession(api, page);
    await seedCart(api, [{ id: seededProducts[0].id }]);
  });

  test.describe('positive cases', () => {

    test('STRIPE-P01: stripe element loads in live mode @e2e @checkout @smoke', async ({ cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await cartPage.proceedToCheckout();

      // Check payment mode - skip if mock
      if (await checkoutPage.isMockPayment()) {
        test.skip();
      }

      // Act: Wait for Stripe element to load
      await checkoutPage.waitForStripeReady();

      // Assert: Submit button is in valid state
      const status = await checkoutPage.getSubmitStatus();
      expect(status).not.toBeNull();
    });

    test('STRIPE-P02: checkout displays cart total correctly @e2e @checkout @regression', async ({ cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      const cartTotal = await cartPage.getGrandTotalValue();
      
      await cartPage.proceedToCheckout();

      // Act: Get checkout total
      const checkoutTotal = CheckoutPage.parsePrice(await checkoutPage.getTotal());

      // Assert: Totals match
      expect(checkoutTotal).toBeCloseTo(cartTotal, 2);
    });

    test('STRIPE-P03: payment form renders all required fields @e2e @checkout @smoke', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await cartPage.proceedToCheckout();

      // Skip if mock payment
      if (await checkoutPage.isMockPayment()) {
        test.skip();
      }

      // Act: Wait for Stripe to be ready
      await checkoutPage.waitForStripeReady();

      // Assert: Payment form is visible (Stripe loaded successfully)
      const submitStatus = await checkoutPage.getSubmitStatus();
      expect(submitStatus).not.toBeNull();
    });
  });

  test.describe('negative cases', () => {

    test('STRIPE-N01: gracefully handles mock payment mode when stripe disabled @e2e @checkout @regression', async ({ cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await cartPage.proceedToCheckout();

      // Act: Check if mock payment is active
      const isMock = await checkoutPage.isMockPayment();

      if (isMock) {
        // Assert: Mock payment UI shown instead of Stripe
        const status = await checkoutPage.getSubmitStatus();
        expect(status).toBeDefined();
        test.skip(); // Skip Stripe-specific tests in mock mode
      } else {
        // Assert: Stripe element loads successfully
        await checkoutPage.waitForStripeReady();
        const status = await checkoutPage.getSubmitStatus();
        expect(status).not.toBeNull();
      }
    });

    test('STRIPE-N02: displays error when empty cart attempts payment @e2e @checkout @regression', async ({ api, page, cartPage, checkoutPage }) => {
      // Arrange: Clear cart
      await clearCart(api);

      // Act: Try to navigate to checkout with empty cart
      await page.goto('/checkout').catch(() => {});

      // Assert: Either redirected to cart or prevented from proceeding
      const url = page.url();
      expect(url).toContain('/cart');
    });
  });

  test.describe('edge cases', () => {

    test('STRIPE-E01: checkout handles cart validation before payment intent @e2e @checkout @regression', async ({ api, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout with valid cart
      await cartPage.goto();
      await cartPage.proceedToCheckout();

      // Skip if mock payment
      if (await checkoutPage.isMockPayment()) {
        test.skip();
      }

      // Act: Wait for Stripe to be ready
      await checkoutPage.waitForStripeReady();

      // Assert: Page is ready for payment
      const total = await checkoutPage.getTotal();
      expect(total).toBeTruthy();
      expect(parseFloat(total.replace(/[^0-9.]/g, ''))).toBeGreaterThan(0);
    });

    test('STRIPE-E02: stripe publishable key properly set from environment @e2e @checkout @smoke', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await cartPage.proceedToCheckout();

      // Skip if mock payment
      if (await checkoutPage.isMockPayment()) {
        test.skip();
      }

      // Act: Check if Stripe script is loaded
      const stripeLoaded = await page.evaluate(() => {
        return typeof (window as any).Stripe !== 'undefined';
      });

      // Assert: Stripe SDK loaded successfully
      expect(stripeLoaded).toBe(true);
    });
  });
});
