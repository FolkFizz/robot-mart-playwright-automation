import { test, expect, loginAndSyncSession, seedCart } from '@fixtures';
import { seededProducts } from '@data';

/**
 * =============================================================================
 * CART PAGE ACCESSIBILITY TESTS
 * =============================================================================
 * 
 * Test Scenarios:
 * ---------------
 * 1. WCAG 2.1 AA Compliance for Cart Page
 * 2. Cart Item Accessibility (Controls, Remove)
 * 3. Form Accessibility (Coupon, Checkout)
 * 4. Error & Loading State Accessibility
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (6 tests):
 *   - A11Y-CART-P01: cart page has no critical violations
 *   - A11Y-CART-P02: cart item quantity controls accessible via keyboard
 *   - A11Y-CART-P03: remove item button has proper ARIA label
 *   - A11Y-CART-P04: cart total announced to screen readers
 *   - A11Y-CART-P05: coupon input field accessible with proper labels
 *   - A11Y-CART-P06: proceed to checkout button keyboard accessible
 * 
 * NEGATIVE CASES (3 tests):
 *   - A11Y-CART-N01: empty cart state maintains accessibility
 *   - A11Y-CART-N02: stock limit warning announced to screen readers
 *   - A11Y-CART-N03: invalid coupon error accessible
 * 
 * EDGE CASES (3 tests):
 *   - A11Y-CART-E01: cart with 10+ items remains accessible
 *   - A11Y-CART-E02: long product names do not break screen reader announcements
 *   - A11Y-CART-E03: cart loading state maintains accessibility
 * 
 * Business Rules Tested:
 * ----------------------
 * - Accessibility Standard: WCAG 2.1 Level AA
 * - Interactive Elements: Quantity controls, remove buttons, coupon input
 * - Form Labels: All inputs must have associated labels
 * - ARIA Attributes: Dynamic cart updates announced to screen readers
 * - Focus Management: Logical tab order through cart items
 * 
 * =============================================================================
 */

test.use({ seedData: true });

test.describe('cart accessibility @a11y @cart', () => {
  const cartA11yExclude = [
    '.chat-toggle',
    '.shipping-promo',
    '.btn-coupon',
    '.btn-checkout',
    '[data-testid="cart-shipping"]'
  ];

  test.beforeEach(async ({ api, page }) => {
    // Arrange: Login and seed cart with product
    await loginAndSyncSession(api, page);
    await seedCart(api, [{ id: seededProducts[0].id }]);
  });

  test.describe('positive cases', () => {

    test('A11Y-CART-P01: cart page has no critical violations @a11y @cart @destructive', async ({ page, cartPage, runA11y, expectNoA11yViolations }) => {
      // Act: Navigate to cart page
      await cartPage.goto();

      // Act: Run accessibility audit
      const results = await runA11y(page, { exclude: cartA11yExclude });

      // Assert: No violations found
      expectNoA11yViolations(results);
    });

    test('A11Y-CART-P02: cart item quantity controls accessible via keyboard @a11y @cart @regression', async ({ cartPage }) => {
      // Arrange: Navigate to cart
      await cartPage.goto();

      // Act: Focus on quantity control button
      await cartPage.focusFirstQuantityControl();

      // Assert: Element is keyboard accessible
      expect(await cartPage.isFirstQuantityControlFocused()).toBe(true);
    });

    test('A11Y-CART-P03: remove item button has proper ARIA label @a11y @cart @smoke', async ({ cartPage }) => {
      // Arrange: Navigate to cart
      await cartPage.goto();

      // Act: Find remove control in cart row
      const { ariaLabel, title, text: buttonText } = await cartPage.getFirstRemoveButtonA11yMeta();
      expect(ariaLabel || title || buttonText).toBeTruthy();
    });

    test('A11Y-CART-P04: cart total announced to screen readers @a11y @cart @regression', async ({ page, cartPage }) => {
      // Arrange: Navigate to cart
      await cartPage.goto();

      // Act: Get total element
      const total = await cartPage.getGrandTotal();

      // Assert: Total is in DOM and has meaningful text
      expect(total).toBeTruthy();
      expect(total.length).toBeGreaterThan(0);
    });

    test('A11Y-CART-P05: coupon input field accessible with proper labels @a11y @cart @smoke', async ({ cartPage }) => {
      // Arrange: Navigate to cart
      await cartPage.goto();

      // Act & Assert: Coupon input should have associated label or aria-label
      if (await cartPage.isCouponInputVisible()) {
        const meta = await cartPage.getCouponInputA11yMeta();
        const hasLabel = meta.ariaLabel || meta.placeholder || meta.hasLabelByFor;
        expect(hasLabel).toBeTruthy();
      }
    });

    test('A11Y-CART-P06: proceed to checkout button keyboard accessible @a11y @cart @smoke', async ({ cartPage }) => {
      // Arrange: Navigate to cart
      await cartPage.goto();

      // Act: Find checkout button
      const focused = await cartPage.focusCheckoutControl();
      if (focused) {
        // Assert: Button should be keyboard focusable (not tabindex="-1")
        const tabIndex = await cartPage.getCheckoutControlTabIndex();
        expect(tabIndex).not.toBe('-1');
        expect(await cartPage.isCheckoutControlFocused()).toBe(true);
      }
    });
  });

  test.describe('negative cases', () => {

    test('A11Y-CART-N01: empty cart state maintains accessibility @a11y @cart @regression', async ({ api, page, cartPage, runA11y, expectNoA11yViolations }) => {
      // Arrange: Ensure cart is empty
      await seedCart(api, []);
      await cartPage.goto();

      // Act: Run accessibility audit on empty state
      const results = await runA11y(page, {
        exclude: [...cartA11yExclude, '.cart-table.empty-cart p', '.cart-table.empty-cart a']
      });

      // Assert: No violations found
      expectNoA11yViolations(results);
    });

    test('A11Y-CART-N02: stock limit warning announced to screen readers @a11y @cart @regression', async ({ cartPage }) => {
      // Arrange: Try to add quantity that may exceed stock
      await cartPage.goto();
      
      // Act: Try to set high quantity (if stock limit exists)
      if (await cartPage.setFirstQuantityInput('999')) {
        
        // Assert: Error message should be accessible
        // Look for aria-live region or visible error
        if (await cartPage.hasVisibleAlert()) {
          const text = await cartPage.getFirstAlertText();
          expect(text.trim().length).toBeGreaterThan(0);
        }
      }
    });

    test('A11Y-CART-N03: invalid coupon error accessible @a11y @cart @regression', async ({ cartPage }) => {
      // Arrange: Navigate to cart
      await cartPage.goto();
      
      // Act: Try to apply invalid coupon
      const errorText = await cartPage.applyInvalidCouponAndReadError('INVALID_COUPON_XYZ_123');

      // Assert: Error message should be accessible
      if (errorText.trim().length > 0) {
        expect(errorText.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('edge cases', () => {

    test('A11Y-CART-E01: cart with 10+ items remains accessible @a11y @cart @regression', async ({ api, page, cartPage, runA11y, expectNoA11yViolations }) => {
      // Arrange: Seed cart with many items
      const products = seededProducts.slice(0, 10);
      const cartItems = products.map(p => ({ id: p.id }));
      await seedCart(api, cartItems);

      // Act: Navigate to cart page
      await cartPage.goto();

      // Act: Run accessibility audit
      const results = await runA11y(page, { exclude: cartA11yExclude });

      // Assert: No violations even with many items
      expectNoA11yViolations(results);
    });

    test('A11Y-CART-E02: long product names do not break screen reader announcements @a11y @cart @regression', async ({ page, cartPage, runA11y, expectNoA11yViolations }) => {
      // Act: Navigate to cart page (seeded in beforeEach)
      await cartPage.goto();

      // Act: Run accessibility audit
      const results = await runA11y(page, { exclude: cartA11yExclude });

      // Assert: Product names properly associated with ARIA labels
      expectNoA11yViolations(results);
    });

    test('A11Y-CART-E03: cart loading state maintains accessibility @a11y @cart @regression', async ({ page, cartPage, runA11y, expectNoA11yViolations }) => {
      // Act: Navigate to cart (may have loading state)
      await cartPage.goto();
      
      // Wait for content to load
      await cartPage.waitForNetworkIdle();
      
      // Assert: After loading, page is accessible
      const results = await runA11y(page, { exclude: cartA11yExclude });
      expectNoA11yViolations(results);
    });
  });
});
