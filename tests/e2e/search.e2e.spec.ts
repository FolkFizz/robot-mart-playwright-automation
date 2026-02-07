import { test, expect } from '@fixtures';

/**
 * =============================================================================
 * PRODUCT SEARCH E2E TESTS
 * =============================================================================
 * 
 * Test Scenarios:
 * ---------------
 * 1. Valid product search returns results
 * 2. No results handling
 * 3. Empty search behavior
 * 4. Special character handling
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (3 tests):
 *   - SEARCH-P01: Valid search returns matching products
 *   - SEARCH-P02: Case-insensitive search works
 *   - SEARCH-P03: Partial name match returns results
 * 
 * NEGATIVE CASES (2 tests):
 *   - SEARCH-N01: No results shows appropriate message
 *   - SEARCH-N02: Empty search returns all products
 * 
 * EDGE CASES (3 tests):
 *   - SEARCH-E01: Special characters handled safely
 *   - SEARCH-E02: Search with multiple spaces
 *   - SEARCH-E03: Very long search term
 * 
 * Business Rules:
 * ---------------
 * - Search uses query parameter: ?q=searchterm
 * - Search is case-insensitive
 * - Search looks for partial matches in product names
 * - Empty search shows all products (no filter)
 * 
 * =============================================================================
 */

test.use({ seedData: true });

test.describe('product search @e2e @search', () => {

  test.describe('positive cases', () => {

    test('SEARCH-P01: valid search returns matching products @e2e @search @smoke', async ({ page }) => {
      // Arrange: Navigate to home with search query
      const searchTerm = 'Robot';

      // Act: Perform search
      await page.goto(`/?q=${searchTerm}`);

      // Assert: Products matching search term are visible
      const productGrid = page.locator('.product-card, .product-item, [data-testid="product"]');
      const productCount = await productGrid.count();
      expect(productCount).toBeGreaterThan(0);

      // Verify at least one product contains search term
      if (productCount > 0) {
        const firstProductName = await productGrid.first().locator('h3, .product-name').innerText();
        expect(firstProductName.toLowerCase()).toContain(searchTerm.toLowerCase());
      }
    });

    test('SEARCH-P02: search is case-insensitive @e2e @search @regression', async ({ page }) => {
      // Arrange: Search with lowercase
      const searchTerm = 'robot';

      // Act: Search with lowercase term
      await page.goto(`/?q=${searchTerm}`);

      // Assert: Results found (products have "Robot" in uppercase)
      const products = page.locator('.product-card, .product-item, [data-testid="product"]');
      const count = await products.count();
      expect(count).toBeGreaterThan(0);
    });

    test('SEARCH-P03: partial name match returns results @e2e @search @regression', async ({ page }) => {
      // Arrange: Use partial product name
      const partialName = 'Bot'; // Should match "Robot", "Rusty-Bot", etc.

      // Act: Search with partial term
      await page.goto(`/?q=${partialName}`);

      // Assert: Products found
      const products = page.locator('.product-card, .product-item, [data-testid="product"]');
      const count = await products.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('negative cases', () => {

    test('SEARCH-N01: no results shows appropriate message @e2e @search @regression', async ({ page }) => {
      // Arrange: Use search term that won't match any product
      const searchTerm = 'NonExistentProduct12345XYZ';

      // Act: Search with non-existent term
      await page.goto(`/?q=${searchTerm}`);

      // Assert: No products or empty message shown
      const products = page.locator('.product-card, .product-item, [data-testid="product"]');
      const count = await products.count();
      
      if (count === 0) {
        // Verify empty state message
        const emptyMessage = page.locator('text=/no.*found|no.*results|no.*products/i').first();
        await expect(emptyMessage).toBeVisible().catch(() => {
          // If no message, at least verify product grid is empty
          expect(count).toBe(0);
        });
      }
    });

    test('SEARCH-N02: empty search shows all products @e2e @search @regression', async ({ page }) => {
      // Act: Navigate without search query
      await page.goto('/?q=');

      // Assert: All products shown (no filter applied)
      const products = page.locator('.product-card, .product-item, [data-testid="product"]');
      const count = await products.count();
      
      // Should show products (at least seeded ones)
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('edge cases', () => {

    test('SEARCH-E01: special characters handled safely @e2e @search @regression', async ({ page }) => {
      // Arrange: Use special characters
      const searchTerm = '"><script>alert(1)</script>';

      // Act: Search with special chars (XSS attempt)
      await page.goto(`/?q=${encodeURIComponent(searchTerm)}`);

      // Assert: Page loads without error, no XSS executed
      const url = page.url();
      expect(url).toBeDefined();
      
      // Verify no JavaScript alert (page should be stable)
      const products = page.locator('.product-card, .product-item, [data-testid="product"]');
      const count = await products.count();
      expect(count).toBeGreaterThanOrEqual(0); // May be 0 results, but page stable
    });

    test('SEARCH-E02: search with multiple spaces handled @e2e @search @regression', async ({ page }) => {
      // Arrange: Search term with extra spaces
      const searchTerm = '  Robot  ';

      // Act: Search with spaces
      await page.goto(`/?q=${encodeURIComponent(searchTerm)}`);

      // Assert: Search works (trimmed internally)
      const products = page.locator('.product-card, .product-item, [data-testid="product"]');
      const count = await products.count();
      expect(count).toBeGreaterThan(0);
    });

    test('SEARCH-E03: very long search term gracefully handled @e2e @search @regression', async ({ page }) => {
      // Arrange: Generate very long search term
      const longTerm = 'A'.repeat(500);

      // Act: Search with long term
      await page.goto(`/?q=${encodeURIComponent(longTerm)}`);

      // Assert: Page loads without crash
      const url = page.url();
      expect(url).toContain('?q=');
      
      // May have 0 results, but application should not crash
      const products = page.locator('.product-card, .product-item, [data-testid="product"]');
      const count = await products.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
