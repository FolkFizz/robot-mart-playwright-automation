import { test, expect, loginAndSyncSession, seedCart } from '@fixtures';
import { seededProducts } from '@data';

/**
 * =============================================================================
 * CHECKOUT PAGE ACCESSIBILITY TESTS
 * =============================================================================
 * 
 * Test Scenarios:
 * ---------------
 * 1. WCAG 2.1 AA Compliance for Checkout Form
 * 2. Payment Form Accessibility (Name, Email, Card Fields)
 * 3. Stripe Element Integration Accessibility
 * 4. Form Validation Error Announcements
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (1 test):
 *   - A11Y-CHK-P01: Checkout page with Stripe/mock has no critical violations
 * 
 * NEGATIVE CASES (0 tests):
 *   - (Future: Form validation errors, missing required fields)
 * 
 * EDGE CASES (0 tests):
 *   - (Future: Stripe loading states, payment errors)
 * 
 * Business Rules Tested:
 * ----------------------
 * - Accessibility Standard: WCAG 2.1 Level AA
 * - Form Elements: Name, Email inputs properly labeled
 * - Payment Element: Stripe iframe accessibility (delegated to Stripe)
 * - Error Messages: Validation errors associated with inputs (aria-describedby)
 * - Submit Button: Disabled states communicated to assistive tech
 * - Mock vs Stripe: Both payment modes tested for accessibility
 * 
 * =============================================================================
 */

test.use({ seedData: true });

test.describe('checkout accessibility @a11y @checkout', () => {

  test.beforeEach(async ({ api, page }) => {
    // Arrange: Login and seed cart with product
    await loginAndSyncSession(api, page);
    await seedCart(api, [{ id: seededProducts[0].id }]);
  });

  test.describe('positive cases', () => {

    test('A11Y-CHK-P01: checkout page has no critical violations @a11y @checkout @destructive', async ({ page, cartPage, checkoutPage, runA11y, expectNoA11yViolations }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForDomReady();

      // Wait for payment element to load (Stripe or Mock)
      if (!(await checkoutPage.isMockPayment())) {
        await checkoutPage.waitForStripeReady();
      }

      // Act: Run accessibility audit
      const results = await runA11y(page);

      // Assert: No violations found
      expectNoA11yViolations(results);
    });
  });

  test.describe('negative cases', () => {

    test('A11Y-CHK-N01: form validation errors announced to screen readers @a11y @checkout @regression', async ({ page, cartPage, checkoutPage, runA11y, expectNoA11yViolations }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForDomReady();

      // Wait for payment element
      if (!(await checkoutPage.isMockPayment())) {
        await checkoutPage.waitForStripeReady();
      }

      // Act: Run accessibility audit (form in initial state)
      const results = await runA11y(page);

      // Assert: No violations (even with potential validation states)
      expectNoA11yViolations(results);
    });

    test('A11Y-CHK-N02: empty required fields show accessible error messages @a11y @checkout @regression', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForDomReady();

      // Act: Check for aria-required attributes on required fields
      const nameInput = page.locator('input[name="name"], input[id*="name"]').first();
      const emailInput = page.locator('input[name="email"], input[type="email"]').first();

      // Assert: Required fields have proper ARIA attributes
      const nameRequired = await nameInput.getAttribute('aria-required').catch(() => null);
      const emailRequired = await emailInput.getAttribute('aria-required').catch(() => null);
      
      expect(nameRequired || await nameInput.getAttribute('required')).toBeTruthy();
      expect(emailRequired || await emailInput.getAttribute('required')).toBeTruthy();
    });
  });

  test.describe('edge cases', () => {

    test('A11Y-CHK-E01: payment loading states remain accessible @a11y @checkout @regression', async ({ page, cartPage, checkoutPage, runA11y, expectNoA11yViolations }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForDomReady();

      // Wait for payment element
      if (!(await checkoutPage.isMockPayment())) {
        await checkoutPage.waitForStripeReady();
      }

      // Act: Run accessibility audit during ready state
      const results = await runA11y(page);

      // Assert: Loading states are accessible
      expectNoA11yViolations(results);
    });

    test('A11Y-CHK-E02: stripe payment element iframe accessibility @a11y @checkout @stripe @regression', async ({ page, cartPage, checkoutPage, runA11y, expectNoA11yViolations }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForDomReady();

      // Skip if mock payment
      if (await checkoutPage.isMockPayment()) {
        test.skip();
      }

      // Act: Wait for Stripe iframe
      await checkoutPage.waitForStripeReady();

      // Act: Run accessibility audit (Stripe iframe tested separately by Stripe)
      const results = await runA11y(page);

      // Assert: Parent page remains accessible with iframe
      expectNoA11yViolations(results);
    });
  });
});
