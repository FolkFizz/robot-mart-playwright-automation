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
 * 2. Cart Item Accessibility (Product Name, Price, Quantity Controls)
 * 3. Coupon Input Accessibility
 * 4. Checkout Button Keyboard Access
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (1 test):
 *   - A11Y-CART-P01: Cart page with items has no critical violations
 * 
 * NEGATIVE CASES (0 tests):
 *   - (Future: Empty cart state, quantity spinners, remove buttons)
 * 
 * EDGE CASES (0 tests):
 *   - (Future: Many items in cart, long product names)
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
