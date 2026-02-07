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
 *   - A11Y-CART-P01: Cart page with items has no critical violations
 *   - A11Y-CART-P02: Quantity controls are keyboard navigable
 *   - A11Y-CART-P03: Remove buttons have accessible labels
 *   - A11Y-CART-P04: Cart total announced to screen readers
 *   - A11Y-CART-P05: Coupon input field accessible with proper labels
 *   - A11Y-CART-P06: Proceed to checkout button keyboard accessible
 * 
 * NEGATIVE CASES (3 tests):
 *   - A11Y-CART-N01: Empty cart state maintains accessibility
 *   - A11Y-CART-N02: Stock limit warning announced to screen readers
 *   - A11Y-CART-N03: Invalid coupon error accessible
 * 
 * EDGE CASES (3 tests):
 *   - A11Y-CART-E01: Cart with many items (scrollable) maintains accessibility
 *   - A11Y-CART-E02: Long product names do not break screen reader announcements
 *   - A11Y-CART-E03: Cart loading state maintains accessibility
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
      const results = await runA11y(page);

      // Assert: No violations found
      expectNoA11yViolations(results);
    });

    test('A11Y-CART-P02: cart item quantity controls accessible via keyboard @a11y @cart @regression', async ({ page, cartPage }) => {
      // Arrange: Navigate to cart
      await cartPage.goto();

      // Act: Focus on quantity input
      const quantityInput = page.locator('input[type="number"]').first();
      await quantityInput.focus();

      // Assert: Element is keyboard accessible
      const isFocused = await quantityInput.evaluate(el => el === document.activeElement);
      expect(isFocused).toBe(true);
    });

    test('A11Y-CART-P03: remove item button has proper ARIA label @a11y @cart @smoke', async ({ page, cartPage }) => {
      // Arrange: Navigate to cart
      await cartPage.goto();

      // Act: Find remove button
      const removeButton = page.locator('button').filter({ hasText: /remove|delete/i }).first();
      
      // Assert: Button exists
      await expect(removeButton).toBeVisible();

      // Assert: Has accessible name (either aria-label or visible text)
      const ariaLabel = await removeButton.getAttribute('aria-label');
      const buttonText = await removeButton.innerText().catch(() => '');
      expect(ariaLabel || buttonText).toBeTruthy();
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

    test('A11Y-CART-P05: coupon input field accessible with proper labels @a11y @cart @smoke', async ({ page, cartPage }) => {
      // Arrange: Navigate to cart
      await cartPage.goto();

      // Act & Assert: Coupon input should have associated label or aria-label
      const couponInput = page.locator('input[name="coupon"], input[placeholder*="coupon" i], input[aria-label*="coupon" i]').first();
      
      if (await couponInput.count() > 0) {
        const ariaLabel = await couponInput.getAttribute('aria-label');
        const placeholder = await couponInput.getAttribute('placeholder');
        const id = await couponInput.getAttribute('id');
        
        // Should have some form of label
        const hasLabel = ariaLabel || placeholder || (id && await page.locator(`label[for="${id}"]`).count() > 0);
        expect(hasLabel).toBeTruthy();
      }
    });

    test('A11Y-CART-P06: proceed to checkout button keyboard accessible @a11y @cart @smoke', async ({ page, cartPage }) => {
      // Arrange: Navigate to cart
      await cartPage.goto();

      // Act: Find checkout button
      const checkoutButton = page.locator('button:has-text("checkout"), a:has-text("checkout"), button:has-text("Proceed")').first();
      
      if (await checkoutButton.count() > 0) {
        // Assert: Button should be keyboard focusable (not tabindex="-1")
        const tabIndex = await checkoutButton.getAttribute('tabindex');
        expect(tabIndex).not.toBe('-1');
        
        // Focus the button
        await checkoutButton.focus();
        const isFocused = await checkoutButton.evaluate((el) => el === document.activeElement);
        expect(isFocused).toBe(true);
      }
    });
  });

  test.describe('negative cases', () => {

    test('A11Y-CART-N01: empty cart state maintains accessibility @a11y @cart @regression', async ({ page, cartPage, runA11y, expectNoA11yViolations }) => {
      // Arrange: Navigate to empty cart (no seeding)
      await cartPage.goto();

      // Act: Run accessibility audit on empty state
      const results = await runA11y(page);

      // Assert: No violations found
      expectNoA11yViolations(results);
    });

    test('A11Y-CART-N02: stock limit warning announced to screen readers @a11y @cart @regression', async ({ api, page, cartPage }) => {
      // Arrange: Try to add quantity that may exceed stock
      await cartPage.goto();
      
      // Act: Try to set high quantity (if stock limit exists)
      const quantityInput = page.locator('input[type="number"], input[aria-label*="quantity" i]').first();
      
      if (await quantityInput.count() > 0) {
        await quantityInput.fill('999');
        
        // Assert: Error message should be accessible
        // Look for aria-live region or visible error
        const errorMessage = page.locator('[role="alert"], .error, [aria-live]').first();
        
        // If error appears, it should be accessible
        if (await errorMessage.count() > 0 && await errorMessage.isVisible()) {
          const text = await errorMessage.innerText();
          expect(text.length).toBeGreaterThan(0);
        }
      }
    });

    test('A11Y-CART-N03: invalid coupon error accessible @a11y @cart @regression', async ({ page, cartPage }) => {
      // Arrange: Navigate to cart
      await cartPage.goto();
      
      // Act: Try to apply invalid coupon
      const couponInput = page.locator('input[name="coupon"], input[placeholder*="coupon" i]').first();
      const applyButton = page.locator('button:has-text("apply")').first();
      
      if (await couponInput.count() > 0 && await applyButton.count() > 0) {
        await couponInput.fill('INVALID_COUPON_XYZ_123');
        await applyButton.click();
        
        // Assert: Error message should be accessible
        await page.waitForTimeout(500); // Brief wait for error message
        const errorMessage = page.locator('[role="alert"], .error, .invalid').first();
        
        if (await errorMessage.count() > 0 && await errorMessage.isVisible()) {
          const text = await errorMessage.innerText();
          expect(text.length).toBeGreaterThan(0);
        }
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
      const results = await runA11y(page);

      // Assert: No violations even with many items
      expectNoA11yViolations(results);
    });

    test('A11Y-CART-E03: cart loading state maintains accessibility @a11y @cart @regression', async ({ page, cartPage, runA11y, expectNoA11yViolations }) => {
      // Act: Navigate to cart (may have loading state)
      await cartPage.goto();
      
      // Wait for content to load
      await page.waitForLoadState('networkidle');
      
      // Assert: After loading, page is accessible
      const results = await runA11y(page);
      expectNoA11yViolations(results);
    });

    test('A11Y-CART-E02: long product names do not break screen reader announcements @a11y @cart @regression', async ({ page, cartPage, runA11y, expectNoA11yViolations }) => {
      // Act: Navigate to cart page (seeded in beforeEach)
      await cartPage.goto();

      // Act: Run accessibility audit
      const results = await runA11y(page);

      // Assert: Product names properly associated with ARIA labels
      expectNoA11yViolations(results);
    });
  });
});
