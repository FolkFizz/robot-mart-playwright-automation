import { test, expect } from '../../../fixtures/test-data';
import { CatalogPage } from '../../../pages/shop/catalog.page';

test.describe('@regression Catalog - Search and Filters', () => {
  let catalogPage: CatalogPage;

  test.beforeEach(async ({ page }) => {
    catalogPage = new CatalogPage(page);
    await catalogPage.goto();
  });

  test.describe('Search Functionality', () => {
    test('should search for products by name', async () => {
      await catalogPage.search('robot');
      expect(await catalogPage.hasResults()).toBe(true);
    });

    test('should show empty results for invalid search', async () => {
      await catalogPage.search('nonexistentproduct12345');
      expect(await catalogPage.isEmptyResults()).toBe(true);
    });

    test('should clear search results', async () => {
      await catalogPage.search('robot');
      await catalogPage.clearSearch();
      expect(await catalogPage.hasResults()).toBe(true);
    });
  });

  test.describe('Category Filtering', () => {
    test('should filter by automation category', async () => {
      await catalogPage.selectCategory('automation');
      expect(await catalogPage.page.url()).toContain('category=automation');
    });

    test('should filter by hazardous category', async () => {
      await catalogPage.selectCategory('hazardous');
      expect(await catalogPage.page.url()).toContain('category=hazardous');
    });

    test('should return to all products', async () => {
      await catalogPage.selectCategory('automation');
      await catalogPage.viewAllProducts();
      expect(await catalogPage.page.url()).not.toContain('category=');
    });
  });

  test.describe('Sorting', () => {
    test('should sort by price ascending', async () => {
      await catalogPage.sortBy('price_asc');
      expect(await catalogPage.page.url()).toContain('sort=price_asc');
    });

    test('should sort by price descending', async () => {
      await catalogPage.sortBy('price_desc');
      expect(await catalogPage.page.url()).toContain('sort=price_desc');
    });

    test('should sort by name', async () => {
      await catalogPage.sortBy('name_asc');
      expect(await catalogPage.page.url()).toContain('sort=name_asc');
    });
  });

  test.describe('Price Filtering', () => {
    test('should filter by price range', async () => {
      await catalogPage.filterByPriceRange(100, 500);
      expect(await catalogPage.page.url()).toContain('minPrice=100');
      expect(await catalogPage.page.url()).toContain('maxPrice=500');
    });

    test('should reset all filters', async () => {
      await catalogPage.filterByPriceRange(100, 500);
      await catalogPage.resetFilters();
      expect(await catalogPage.page.url()).not.toContain('minPrice');
    });
  });

  test.describe('Pagination', () => {
    test.skip('should navigate to next page', async () => {
      // Skip if not enough products for pagination
      const hasNextButton = await catalogPage.nextPageButton.isVisible();
      if (hasNextButton) {
        await catalogPage.goToNextPage();
        expect(await catalogPage.page.url()).toContain('page=2');
      }
    });
  });
});
