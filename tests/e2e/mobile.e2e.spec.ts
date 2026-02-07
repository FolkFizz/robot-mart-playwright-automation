import { test, expect, loginAndSyncSession } from '@fixtures';
import { seededProducts } from '@data';

/**
 * =============================================================================
 * MOBILE VIEWPORT E2E TESTS
 * =============================================================================
 * 
 * Test Scenarios:
 * ---------------
 * 1. Mobile navigation functionality
 * 2. Mobile cart operations
 * 3. Mobile product browsing
 * 4. Mobile checkout flow
 * 5. Responsive layout verification
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (4 tests):
 *   - MOBILE-P01: Mobile navigation menu works
 *   - MOBILE-P02: Add product to cart on mobile
 *   - MOBILE-P03: View cart on mobile viewport
 *   - MOBILE-P04: Mobile checkout accessible
 * 
 * EDGE CASES (1 test):
 *   - MOBILE-E01: Product grid responsive on mobile
 * 
 * Business Rules:
 * ---------------
 * - Mobile viewport: 375x667 (iPhone SE)
 * - All core features accessible on mobile
 * - Touch-friendly UI elements
 * - Responsive layout adjusts properly
 * 
 * =============================================================================
 */

test.use({ 
  seedData: true,
  viewport: { width: 375, height: 667 } // iPhone SE
});

test.describe('mobile viewport @e2e @mobile', () => {

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
  });

  test.describe('positive cases', () => {

    test('MOBILE-P01: mobile navigation menu accessible @e2e @mobile @smoke', async ({ page }) => {
      // Act: Navigate to home on mobile
      await page.goto('/');

      // Assert: Page loads in mobile viewport
      const viewport = page.viewportSize();
      expect(viewport?.width).toBe(375);
      expect(viewport?.height).toBe(667);

      // Verify navigation exists (hamburger menu or nav links)
      const nav = page.locator('nav, .navbar, .header, [role="navigation"]').first();
      await expect(nav).toBeVisible();
    });

    test('MOBILE-P02: add product to cart on mobile viewport @e2e @mobile @regression', async ({ page, homePage, productPage, cartPage }) => {
      // Arrange: Navigate to home
      await homePage.goto();

      // Act: Click product and add to cart
      await homePage.clickProductById(seededProducts[0].id);
      await productPage.addToCart();

      // Assert: Navigate to cart and verify product added
      await cartPage.goto();
      const itemCount = await cartPage.getItemCount();
      expect(itemCount).toBeGreaterThan(0);
    });

    test('MOBILE-P03: view and interact with cart on mobile @e2e @mobile @regression', async ({ page, cartPage }) => {
      // Arrange: Navigate to cart
      await cartPage.goto();

      // Assert: Cart page loads on mobile
      await expect(page).toHaveURL(/\/cart/);
      
      // Verify cart content visible
      const cartContent = page.locator('.cart, .cart-container, [data-testid="cart"]').first();
      await expect(cartContent).toBeVisible();
    });

    test('MOBILE-P04: checkout page accessible on mobile @e2e @mobile @regression @destructive', async ({ api, page, cartPage }) => {
      // Arrange: Add item to cart
      await api.post('/api/cart/add', {
        data: { productId: seededProducts[0].id, quantity: 1 }
      });

      // Act: Navigate to checkout
      await cartPage.goto();
      await cartPage.proceedToCheckout();

      // Assert: Checkout page loads
      await expect(page).toHaveURL(/\/checkout/);
      
      // Verify checkout form visible
      const checkoutForm = page.locator('form, .checkout-form').first();
      await expect(checkoutForm).toBeVisible();
    });
  });

  test.describe('edge cases', () => {

    test('MOBILE-E01: product grid responsive on small screen @e2e @mobile @regression', async ({ page, homePage }) => {
      // Act: Navigate to home
      await homePage.goto();

      // Assert: Product grid exists and is visible
      const productGrid = page.locator('.product-card, .product-item, [data-testid="product"]');
      const productCount = await productGrid.count();
      expect(productCount).toBeGreaterThan(0);

      // Verify products are laid out properly (not overflowing)
      const firstProduct = productGrid.first();
      await expect(firstProduct).toBeVisible();
      
      // Check that product card fits in viewport
      const box = await firstProduct.boundingBox();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(375); // Within viewport width
      }
    });
  });
});
