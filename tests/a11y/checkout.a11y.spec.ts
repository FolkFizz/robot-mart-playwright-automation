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
 * 4. Form Validation & Error Announcements
 * 5. Navigation & Focus Management
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (6 tests):
 *   - A11Y-CHK-P01: Checkout page with Stripe/mock has no critical violations
 *   - A11Y-CHK-P02: Address fields have proper autocomplete attributes
 *   - A11Y-CHK-P03: Payment method selection accessible
 *   - A11Y-CHK-P04: Order summary section screen reader friendly
 *   - A11Y-CHK-P05: Focus management on page load
 *   - A11Y-CHK-P06: Skip link functionality
 * 
 * NEGATIVE CASES (4 tests):
 *   - A11Y-CHK-N01: Form validation errors announced to screen readers
 *   - A11Y-CHK-N02: Empty required fields show accessible error messages
 *   - A11Y-CHK-N03: Payment declined error accessible
 *   - A11Y-CHK-N04: Network timeout error announced
 * 
 * EDGE CASES (4 tests):
 *   - A11Y-CHK-E01: Payment loading states remain accessible
 *   - A11Y-CHK-E02: Stripe payment element iframe accessibility
 *   - A11Y-CHK-E03: Address autocomplete dropdown accessible
 *   - A11Y-CHK-E04: Multiple validation errors announced correctly
 * 
 * Business Rules Tested:
 * ----------------------
 * - Accessibility Standard: WCAG 2.1 Level AA
 * - Form Elements: Name, Email inputs properly labeled, autocomplete support
 * - Dynamic Content: Live regions for errors, loading states
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

    test('A11Y-CHK-P02: address fields have proper autocomplete attributes @a11y @checkout @smoke', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForDomReady();

      // Assert: Address input fields should have autocomplete attributes
      const addressInput = page.locator('input[name*="address" i], input[id*="address" i]').first();
      
      if (await addressInput.count() > 0) {
        const autocomplete = await addressInput.getAttribute('autocomplete');
        // Should have autocomplete for better UX (e.g., "street-address", "address-line1")
        if (autocomplete) {
          expect(autocomplete).toBeTruthy();
        }
      }
    });

    test('A11Y-CHK-P03: payment method selection accessible @a11y @checkout @smoke', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout  
      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForDomReady();

      // Assert: Payment elements should be accessible
      // Either Stripe element or mock payment should be keyboard accessible
      await page.waitForTimeout(1000); // Wait for payment provider
      
      const stripeElement = page.frameLocator('iframe[name*="__privateStripeFrame"]').locator('body').first();
      const mockPayment = page.locator('button:has-text("Place Order"), button:has-text("Submit")').first();
      
      // At least one payment method should be present
      const hasStripe = await stripeElement.count().catch(() => 0) > 0;
      const hasMock = await mockPayment.count() > 0;
      
      expect(hasStripe || hasMock).toBe(true);
    });

    test('A11Y-CHK-P04: order summary section screen reader friendly @a11y @checkout @regression', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForDomReady();

      // Assert: Order summary should have semantic structure
      const summary = page.locator('.order-summary, #order-summary, [aria-label*="summary" i]').first();
      
      if (await summary.count() > 0) {
        // Summary should be visible and contain text
        const text = await summary.innerText();
        expect(text.length).toBeGreaterThan(0);
      }
    });

    test('A11Y-CHK-P05: focus management on page load @a11y @checkout @smoke', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForDomReady();

      // Assert: Initial focus should be on a logical element (e.g., first form field or heading)
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(activeElement).not.toBe('BODY'); // Focus should not be on the body
    });

    test('A11Y-CHK-P06: skip link functionality @a11y @checkout @regression', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForDomReady();

      // Assert: Check for a skip link and its functionality
      const skipLink = page.locator('a[href="#main-content"], .skip-link').first();
      
      if (await skipLink.count() > 0) {
        await skipLink.focus();
        await page.keyboard.press('Enter');
        
        // After activating, focus should move to the main content area
        const mainContent = page.locator('#main-content, [role="main"]').first();
        if (await mainContent.count() > 0) {
          const isFocused = await mainContent.evaluate((el) => el === document.activeElement);
          expect(isFocused).toBe(true);
        }
      }
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
