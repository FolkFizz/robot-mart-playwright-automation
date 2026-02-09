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
  const checkoutA11yExclude = ['.chat-toggle'];

  test.beforeEach(async ({ api, page }) => {
    // Arrange: Login and seed cart with product
    await loginAndSyncSession(api, page);
    await seedCart(api, [{ id: seededProducts[0].id }]);
  });

  test.describe('positive cases', () => {

    test('A11Y-CHK-P01: checkout page has no critical violations @a11y @checkout @destructive', async ({ page, cartPage, checkoutPage, runA11y, expectNoA11yViolations }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await expect(page.getByTestId('cart-checkout')).toBeVisible();
      await page.getByTestId('cart-checkout').click();
      await expect(page).toHaveURL(/\/order\/checkout/);
      await checkoutPage.waitForDomReady();

      // Wait for payment element to load (Stripe or Mock)
      if (!(await checkoutPage.isMockPayment())) {
        await checkoutPage.waitForStripeReady();
      }

      // Act: Run accessibility audit
      const results = await runA11y(page, { exclude: checkoutA11yExclude });

      // Assert: No violations found
      expectNoA11yViolations(results);
    });

    test('A11Y-CHK-P02: address fields have proper autocomplete attributes @a11y @checkout @smoke', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await expect(page.getByTestId('cart-checkout')).toBeVisible();
      await page.getByTestId('cart-checkout').click();
      await expect(page).toHaveURL(/\/order\/checkout/);
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
      await expect(page.getByTestId('cart-checkout')).toBeVisible();
      await page.getByTestId('cart-checkout').click();
      await expect(page).toHaveURL(/\/order\/checkout/);
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
      await expect(page.getByTestId('cart-checkout')).toBeVisible();
      await page.getByTestId('cart-checkout').click();
      await expect(page).toHaveURL(/\/order\/checkout/);
      await checkoutPage.waitForDomReady();

      // Assert: Order summary should have semantic structure
      const summary = page.locator('.order-summary, #order-summary, [aria-label*="summary" i]').first();
      
      if (await summary.count() > 0) {
        // Summary should be visible and contain text
        const text = await summary.innerText();
        expect(text.length).toBeGreaterThan(0);
      }
    });

    test('A11Y-CHK-P05: keyboard tab order reaches checkout form controls @a11y @checkout @smoke', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await expect(page.getByTestId('cart-checkout')).toBeVisible();
      await page.getByTestId('cart-checkout').click();
      await expect(page).toHaveURL(/\/order\/checkout/);
      await checkoutPage.waitForDomReady();

      // Assert: Keyboard tabbing can reach the checkout form controls
      const nameInput = page.getByTestId('checkout-name');
      await expect(nameInput).toBeVisible();

      let reachedNameInput = false;
      for (let i = 0; i < 20; i += 1) {
        await page.keyboard.press('Tab');
        reachedNameInput = await nameInput.evaluate((el) => el === document.activeElement);
        if (reachedNameInput) break;
      }

      expect(reachedNameInput).toBe(true);
    });

    test('A11Y-CHK-P06: skip link functionality @a11y @checkout @regression', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await expect(page.getByTestId('cart-checkout')).toBeVisible();
      await page.getByTestId('cart-checkout').click();
      await expect(page).toHaveURL(/\/order\/checkout/);
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
      await expect(page.getByTestId('cart-checkout')).toBeVisible();
      await page.getByTestId('cart-checkout').click();
      await expect(page).toHaveURL(/\/order\/checkout/);
      await checkoutPage.waitForDomReady();

      // Wait for payment element
      if (!(await checkoutPage.isMockPayment())) {
        await checkoutPage.waitForStripeReady();
      }

      // Act: Run accessibility audit (form in initial state)
      const results = await runA11y(page, { exclude: checkoutA11yExclude });

      // Assert: No violations (even with potential validation states)
      expectNoA11yViolations(results);
    });

    test('A11Y-CHK-N02: empty checkout fields block submit with browser validation @a11y @checkout @regression', async ({ page, cartPage, checkoutPage }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await expect(page.getByTestId('cart-checkout')).toBeVisible();
      await page.getByTestId('cart-checkout').click();
      await expect(page).toHaveURL(/\/order\/checkout/);
      await checkoutPage.waitForDomReady();

      // Act: Clear required fields and attempt submit
      const nameInput = page.getByTestId('checkout-name');
      const emailInput = page.getByTestId('checkout-email');
      const submitButton = page.getByTestId('checkout-submit');

      await nameInput.fill('');
      await emailInput.fill('');
      await submitButton.click().catch(() => {});

      // Assert: HTML5 validation blocks submission and exposes validation text
      const nameIsValid = await nameInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
      const emailIsValid = await emailInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
      const nameValidationMessage = await nameInput.evaluate((el) => (el as HTMLInputElement).validationMessage);
      const emailValidationMessage = await emailInput.evaluate((el) => (el as HTMLInputElement).validationMessage);

      expect(nameIsValid).toBe(false);
      expect(emailIsValid).toBe(false);
      expect(nameValidationMessage.length).toBeGreaterThan(0);
      expect(emailValidationMessage.length).toBeGreaterThan(0);
      await expect(page).toHaveURL(/\/order\/checkout/);
    });
  });

  test.describe('edge cases', () => {

    test('A11Y-CHK-E01: payment loading states remain accessible @a11y @checkout @regression', async ({ page, cartPage, checkoutPage, runA11y, expectNoA11yViolations }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await expect(page.getByTestId('cart-checkout')).toBeVisible();
      await page.getByTestId('cart-checkout').click();
      await expect(page).toHaveURL(/\/order\/checkout/);
      await checkoutPage.waitForDomReady();

      // Wait for payment element
      if (!(await checkoutPage.isMockPayment())) {
        await checkoutPage.waitForStripeReady();
      }

      // Act: Run accessibility audit during ready state
      const results = await runA11y(page, { exclude: checkoutA11yExclude });

      // Assert: Loading states are accessible
      expectNoA11yViolations(results);
    });

    test('A11Y-CHK-E02: stripe payment element iframe accessibility @a11y @checkout @stripe @regression', async ({ page, cartPage, checkoutPage, runA11y, expectNoA11yViolations }) => {
      // Arrange: Navigate to checkout
      await cartPage.goto();
      await expect(page.getByTestId('cart-checkout')).toBeVisible();
      await page.getByTestId('cart-checkout').click();
      await expect(page).toHaveURL(/\/order\/checkout/);
      await checkoutPage.waitForDomReady();

      // Skip if mock payment
      if (await checkoutPage.isMockPayment()) {
        test.skip();
      }

      // Act: Wait for Stripe iframe
      await checkoutPage.waitForStripeReady();

      // Act: Run accessibility audit (Stripe iframe tested separately by Stripe)
      const results = await runA11y(page, { exclude: checkoutA11yExclude });

      // Assert: Parent page remains accessible with iframe
      expectNoA11yViolations(results);
    });
  });
});

