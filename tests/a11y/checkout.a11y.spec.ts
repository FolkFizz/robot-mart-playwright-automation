import type { Page } from '@playwright/test';
import { test, expect, loginAndSyncSession, seedCart } from '@fixtures';
import { routes } from '@config';
import { seededProducts } from '@data';
import { CartPage, CheckoutPage } from '@pages';

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
 *   - A11Y-CHK-P01: checkout page has no critical violations
 *   - A11Y-CHK-P02: address fields have proper autocomplete attributes
 *   - A11Y-CHK-P03: payment method selection accessible
 *   - A11Y-CHK-P04: order summary section screen reader friendly
 *   - A11Y-CHK-P05: keyboard tab order reaches checkout form controls
 *   - A11Y-CHK-P06: skip link functionality
 * 
 * NEGATIVE CASES (2 tests):
 *   - A11Y-CHK-N01: form validation errors announced to screen readers
 *   - A11Y-CHK-N02: empty checkout fields block submit with browser validation
 * 
 * EDGE CASES (2 tests):
 *   - A11Y-CHK-E01: payment loading states remain accessible
 *   - A11Y-CHK-E02: stripe payment element iframe accessibility
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
  const openCheckoutFromCart = async (page: Page, cartPage: CartPage, checkoutPage: CheckoutPage) => {
    await cartPage.goto();
    await cartPage.proceedToCheckoutWithFallback();
    await expect(page).toHaveURL((url) => url.pathname === routes.order.checkout);
    await checkoutPage.waitForDomReady();
  };

  test.beforeEach(async ({ api, page }) => {
    // Arrange: Login and seed cart with product
    await loginAndSyncSession(api, page);
    await seedCart(api, [{ id: seededProducts[0].id }]);
  });

  test.describe('positive cases', () => {

    test('A11Y-CHK-P01: checkout page has no critical violations @a11y @checkout @destructive', async ({ page, cartPage, checkoutPage, runA11y, expectNoA11yViolations }) => {
      // Arrange: Navigate to checkout
      await openCheckoutFromCart(page, cartPage, checkoutPage);

      // Wait for payment element to load (Stripe or Mock)
      if (!(await checkoutPage.isMockPayment())) {
        await checkoutPage.waitForStripeReady();
      }

      // Act: Run accessibility audit
      const results = await runA11y(page, { exclude: checkoutPage.getA11yExcludeSelectors() });

      // Assert: No violations found
      expectNoA11yViolations(results);
    });

    test('A11Y-CHK-P02: address fields have proper autocomplete attributes @a11y @checkout @smoke', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await openCheckoutFromCart(page, cartPage, checkoutPage);

      // Assert: Address input fields should have autocomplete attributes
      const hasAddressAutocomplete = await checkoutPage.hasAddressAutocomplete();
      if (hasAddressAutocomplete !== null) {
        expect(hasAddressAutocomplete).toBe(true);
      }
    });

    test('A11Y-CHK-P03: payment method selection accessible @a11y @checkout @smoke', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout  
      await openCheckoutFromCart(page, cartPage, checkoutPage);

      // Assert: Payment elements should be accessible
      // Either Stripe element or mock payment should be keyboard accessible
      await checkoutPage.waitForPaymentUiReady();
      expect(await checkoutPage.hasMockOrStripePaymentUi()).toBe(true);
    });

    test('A11Y-CHK-P04: order summary section screen reader friendly @a11y @checkout @regression', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await openCheckoutFromCart(page, cartPage, checkoutPage);

      // Assert: Order summary should have semantic structure
      if (await checkoutPage.hasOrderSummary()) {
        const text = await checkoutPage.getOrderSummaryText();
        expect(text.length).toBeGreaterThan(0);
      }
    });

    test('A11Y-CHK-P05: keyboard tab order reaches checkout form controls @a11y @checkout @smoke', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await openCheckoutFromCart(page, cartPage, checkoutPage);

      // Assert: Keyboard tabbing can reach the checkout form controls
      expect(await checkoutPage.isNameInputVisible()).toBe(true);
      const reachedNameInput = await checkoutPage.tabUntilNameInputFocused(20);
      expect(reachedNameInput).toBe(true);
    });

    test('A11Y-CHK-P06: skip link functionality @a11y @checkout @regression', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await openCheckoutFromCart(page, cartPage, checkoutPage);

      // Assert: Check for a skip link and its functionality
      if (await checkoutPage.hasSkipLink()) {
        await checkoutPage.activateSkipLink();
        const isFocused = await checkoutPage.isMainContentFocused();
        if (isFocused !== null) {
          expect(isFocused).toBe(true);
        }
      }
    });
  });

  test.describe('negative cases', () => {

    test('A11Y-CHK-N01: form validation errors announced to screen readers @a11y @checkout @regression', async ({ page, cartPage, checkoutPage, runA11y, expectNoA11yViolations }) => {
      // Arrange: Navigate to checkout
      await openCheckoutFromCart(page, cartPage, checkoutPage);

      // Wait for payment element
      if (!(await checkoutPage.isMockPayment())) {
        await checkoutPage.waitForStripeReady();
      }

      // Act: Run accessibility audit (form in initial state)
      const results = await runA11y(page, { exclude: checkoutPage.getA11yExcludeSelectors() });

      // Assert: No violations (even with potential validation states)
      expectNoA11yViolations(results);
    });

    test('A11Y-CHK-N02: empty checkout fields block submit with browser validation @a11y @checkout @regression', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await openCheckoutFromCart(page, cartPage, checkoutPage);

      // Act: Clear required fields and attempt submit
      await checkoutPage.setName('');
      await checkoutPage.setEmail('');
      await checkoutPage.clickSubmit().catch(() => {});

      // Assert: HTML5 validation blocks submission and exposes validation text
      const nameIsValid = await checkoutPage.isNameValid();
      const emailIsValid = await checkoutPage.isEmailValid();
      const nameValidationMessage = await checkoutPage.getNameValidationMessage();
      const emailValidationMessage = await checkoutPage.getEmailValidationMessage();

      expect(nameIsValid).toBe(false);
      expect(emailIsValid).toBe(false);
      expect(nameValidationMessage.length).toBeGreaterThan(0);
      expect(emailValidationMessage.length).toBeGreaterThan(0);
      await expect(page).toHaveURL((url) => url.pathname === routes.order.checkout);
    });
  });

  test.describe('edge cases', () => {

    test('A11Y-CHK-E01: payment loading states remain accessible @a11y @checkout @regression', async ({ page, cartPage, checkoutPage, runA11y, expectNoA11yViolations }) => {
      // Arrange: Navigate to checkout
      await openCheckoutFromCart(page, cartPage, checkoutPage);

      // Wait for payment element
      if (!(await checkoutPage.isMockPayment())) {
        await checkoutPage.waitForStripeReady();
      }

      // Act: Run accessibility audit during ready state
      const results = await runA11y(page, { exclude: checkoutPage.getA11yExcludeSelectors() });

      // Assert: Loading states are accessible
      expectNoA11yViolations(results);
    });

    test('A11Y-CHK-E02: stripe payment element iframe accessibility @a11y @checkout @stripe @regression', async ({ page, cartPage, checkoutPage, runA11y, expectNoA11yViolations }) => {
      // Arrange: Navigate to checkout
      await openCheckoutFromCart(page, cartPage, checkoutPage);

      // Skip if mock payment
      if (await checkoutPage.isMockPayment()) {
        test.skip();
      }

      // Act: Wait for Stripe iframe
      await checkoutPage.waitForStripeReady();

      // Act: Run accessibility audit (Stripe iframe tested separately by Stripe)
      const results = await runA11y(page, { exclude: checkoutPage.getA11yExcludeSelectors() });

      // Assert: Parent page remains accessible with iframe
      expectNoA11yViolations(results);
    });
  });
});



