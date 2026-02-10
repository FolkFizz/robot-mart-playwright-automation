import { test, expect } from '@fixtures';
import { seededProducts, catalogSearch, catalogCategories, catalogSort, catalogPrice } from '@data';

/**
 * =============================================================================
 * CATALOG & PRODUCT DISCOVERY TESTS - Comprehensive Coverage
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Product Search (Keywords, Partial Terms, Case-Insensitive)
 * 2. Category Filtering (Automation, High-Tech)
 * 3. Price Range Filtering (Min/Max Boundaries)
 * 4. Sorting (Price Asc/Desc, Name Asc/Desc)
 * 5. Product Detail Navigation
 * 6. Empty State Handling (No Results)
 * 7. URL Query Parameter Management
 * 8. Boundary and malformed query handling
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (15 tests):
 *   - CAT-P01: home shows main controls
 *   - CAT-P02: search updates URL query
 *   - CAT-P03: sort updates URL query
 *   - CAT-P04: category selection updates URL
 *   - CAT-P05: price filter updates URL
 *   - CAT-P06: seeded products visible
 *   - CAT-P07: search is case-insensitive
 *   - CAT-P08: search by partial term
 *   - CAT-P09: filter by category automation
 *   - CAT-P10: filter by price max 500
 *   - CAT-P11: sort by price asc
 *   - CAT-P12: sort by price desc
 *   - CAT-P13: sort by name asc
 *   - CAT-P14: open product detail by clicking card
 *   - CAT-P15: product card displays correct price
 *
 * NEGATIVE CASES (8 tests):
 *   - CAT-N01: search with no results shows empty state
 *   - CAT-N02: invalid category shows empty state
 *   - CAT-N03: price range min > max shows empty state
 *   - CAT-N04: search + category mismatch shows empty state
 *   - CAT-N05: search with special chars shows empty state
 *   - CAT-N06: invalid sort query does not break catalog rendering
 *   - CAT-N07: non-numeric price query falls back gracefully
 *   - CAT-N08: whitespace-padded search term returns no results
 *
 * EDGE CASES (4 tests):
 *   - CAT-E01: exact price boundary (min=max) is inclusive
 *   - CAT-E02: deep-link with combined filters resolves deterministically
 *   - CAT-E03: repeated same search remains idempotent
 *   - CAT-E04: filter+sort combination preserves both constraints
 *
 * Business Rules Tested:
 * ----------------------
 * - Search: Case-insensitive, partial term matching, searches name and description
 * - Category Filter: Products belong to one or more categories
 * - Price Filter: Filters by product price (inclusive ranges)
 * - Sort: Client-side or server-side sorting by price/name
 * - URL State: All filters reflected in URL query params (shareable links)
 * - Empty State: User-friendly message when no products match criteria
 *
 * =============================================================================
 */

test.use({ seedData: true });

test.describe('catalog comprehensive @e2e @catalog', () => {
  test.describe('positive cases', () => {
    test('CAT-P01: home shows main controls @smoke @e2e @safe', async ({ homePage }) => {
      // Act: Load homepage
      await homePage.goto();

      // Assert: Main catalog controls visible
      await expect(homePage.getSearchInput()).toBeVisible();
      await expect(homePage.getSortSelect()).toBeVisible();
      await expect(homePage.getCategoryList()).toBeVisible();
    });

    test('CAT-P02: search updates URL query @e2e @safe', async ({ page, homePage }) => {
      // Arrange & Act: Perform search
      await homePage.goto();
      await homePage.search(catalogSearch.term);

      // Assert: URL contains search query
      await expect(page).toHaveURL(new RegExp(`q=${catalogSearch.term}`, 'i'));
    });

    test('CAT-P03: sort updates URL query @e2e @safe', async ({ page, homePage }) => {
      // Arrange & Act: Change sort
      await homePage.goto();
      await homePage.selectSort(catalogSort.priceDesc);

      // Assert: URL contains sort parameter
      await expect(page).toHaveURL(new RegExp(`sort=${catalogSort.priceDesc}`, 'i'));
    });

    test('CAT-P04: category selection updates URL @e2e @safe', async ({ page, homePage }) => {
      // Arrange & Act: Select category
      await homePage.goto();
      await homePage.selectCategory(catalogCategories.automation);

      // Assert: URL contains category parameter
      await expect(page).toHaveURL(new RegExp(`category=${catalogCategories.automation}`, 'i'));
    });

    test('CAT-P05: price filter updates URL @e2e @safe', async ({ page, homePage }) => {
      // Arrange & Act: Apply price filter
      await homePage.goto();
      await homePage.applyPriceFilter(catalogPrice.min, catalogPrice.max);

      // Assert: URL contains both min and max price
      await expect(page).toHaveURL(new RegExp(`minPrice=${catalogPrice.min}`, 'i'));
      await expect(page).toHaveURL(new RegExp(`maxPrice=${catalogPrice.max}`, 'i'));
    });

    test('CAT-P06: seeded products visible @smoke @e2e @destructive', async ({ homePage }) => {
      // Act: Load homepage
      await homePage.goto();

      // Assert: All seeded products visible
      for (const product of seededProducts) {
        await homePage.waitForProductCardVisible(product.id);
      }
    });

    test('CAT-P07: search is case-insensitive @e2e @destructive', async ({ homePage }) => {
      const target = seededProducts[1];

      // Act: Search in uppercase
      await homePage.goto();
      await homePage.search(target.name.toUpperCase());

      // Assert: Product found regardless of case
      await homePage.waitForProductCardVisible(target.id);
      const title = await homePage.getProductCardTitle(target.id);
      expect(title).toContain(target.name);
    });

    test('CAT-P08: search by partial term @e2e @destructive', async ({ homePage }) => {
      const target = seededProducts[0];

      // Act: Search partial term
      await homePage.goto();
      await homePage.search(catalogSearch.partial);

      // Assert: Product found
      await homePage.waitForProductCardVisible(target.id);
    });

    test('CAT-P09: filter by category automation @e2e @destructive', async ({ homePage }) => {
      // Act: Select automation category
      await homePage.goto();
      await homePage.selectCategory(catalogCategories.automation);

      // Assert: Only automation products visible
      await homePage.waitForProductCardVisible(seededProducts[0].id);
      await homePage.waitForProductCardVisible(seededProducts[1].id);
      expect(await homePage.isProductCardVisible(seededProducts[2].id)).toBe(false);

      const badgeText = await homePage.getFirstBadgeText();
      expect(badgeText.toLowerCase()).toContain(catalogCategories.automation);
    });

    test('CAT-P10: filter by price max 500 @e2e @destructive', async ({ homePage }) => {
      // Act: Apply price filter (max 500)
      await homePage.goto();
      await homePage.applyPriceFilter(0, catalogPrice.maxAffordable);

      // Assert: Only affordable products visible
      await homePage.waitForProductCardVisible(seededProducts[0].id);
      await homePage.waitForProductCardVisible(seededProducts[1].id);
      expect(await homePage.isProductCardVisible(seededProducts[2].id)).toBe(false);
    });

    test('CAT-P11: sort by price asc @e2e @destructive', async ({ homePage }) => {
      // Act: Sort by price ascending
      await homePage.goto();
      await homePage.selectSort(catalogSort.priceAsc);

      // Assert: Products sorted correctly
      const values = await homePage.getVisibleProductPriceValues();
      expect(values.length).toBeGreaterThan(1);
      const sorted = [...values].sort((a, b) => a - b);
      expect(values).toEqual(sorted);
    });

    test('CAT-P12: sort by price desc @e2e @destructive', async ({ homePage }) => {
      // Act: Sort by price descending
      await homePage.goto();
      await homePage.selectSort(catalogSort.priceDesc);

      // Assert: Products sorted correctly
      const values = await homePage.getVisibleProductPriceValues();
      expect(values.length).toBeGreaterThan(1);
      const sorted = [...values].sort((a, b) => b - a);
      expect(values).toEqual(sorted);
    });

    test('CAT-P13: sort by name asc @e2e @destructive', async ({ homePage }) => {
      // Act: Sort by name ascending
      await homePage.goto();
      await homePage.selectSort(catalogSort.nameAsc);

      // Assert: Products sorted alphabetically
      const names = await homePage.getVisibleProductTitleTexts();
      expect(names.length).toBeGreaterThan(1);
      const normalized = names.map((n: string) => n.trim().toLowerCase());
      const sorted = [...normalized].sort();
      expect(normalized).toEqual(sorted);
    });

    test('CAT-P14: open product detail by clicking card @e2e @destructive', async ({
      homePage,
      productPage
    }) => {
      const target = seededProducts[0];

      // Act: Click product card
      await homePage.goto();
      await homePage.clickProductById(target.id);

      // Assert: Product detail page loaded with correct data
      const title = await productPage.getTitle();
      const priceValue = await productPage.getPriceValue();

      expect(title).toContain(target.name);
      expect(priceValue).toBeCloseTo(target.price, 2);
    });

    test('CAT-P15: product card displays correct price @e2e @destructive', async ({ homePage }) => {
      const target = seededProducts[1];

      // Act: Load homepage
      await homePage.goto();

      // Assert: Product card shows correct price
      const value = await homePage.getProductCardPriceValue(target.id);
      expect(value).toBeCloseTo(target.price, 2);
    });
  });

  test.describe('negative cases', () => {
    test('CAT-N01: search with no results shows empty state @e2e @regression @safe', async ({
      homePage
    }) => {
      // Act: Search for non-existent product
      await homePage.goto();
      await homePage.search(catalogSearch.noResults);

      // Assert: Empty state displayed
      await homePage.waitForEmptyState();
    });

    test('CAT-N02: invalid category shows empty state @e2e @regression @safe', async ({
      homePage
    }) => {
      // Act: Navigate to invalid category
      await homePage.gotoWithQuery(`category=${catalogCategories.unknown}`);

      // Assert: Empty state displayed
      await homePage.waitForEmptyState();
    });

    test('CAT-N03: price range min > max shows empty state @e2e @regression @destructive', async ({
      homePage
    }) => {
      // Act: Apply invalid price range
      await homePage.goto();
      await homePage.applyPriceFilter(catalogPrice.invalidMin, catalogPrice.invalidMax);

      // Assert: Empty state (no products match)
      await homePage.waitForEmptyState();
    });

    test('CAT-N04: search + category mismatch shows empty state @e2e @regression @destructive', async ({
      homePage
    }) => {
      // Act: Combine incompatible filters
      await homePage.goto();
      await homePage.selectCategory(catalogCategories.highTech);
      await homePage.search(catalogSearch.partial);

      // Assert: Empty state (no match)
      await homePage.waitForEmptyState();
    });

    test('CAT-N05: search with special chars shows empty state @e2e @regression @destructive', async ({
      homePage
    }) => {
      // Act: Search with special characters
      await homePage.goto();
      await homePage.search(catalogSearch.specialChars);

      // Assert: Graceful handling (empty state)
      await homePage.waitForEmptyState();
    });

    test('CAT-N06: invalid sort query does not break catalog rendering @e2e @regression @destructive', async ({
      homePage
    }) => {
      // Act: Open catalog with unsupported sort option
      await homePage.gotoWithQuery('sort=not_a_real_sort');

      // Assert: Catalog still renders products (fallback behavior)
      expect(await homePage.hasProducts()).toBe(true);
      await expect(homePage.getSearchInput()).toBeVisible();
      await expect(homePage.getSortSelect()).toBeVisible();
    });

    test('CAT-N07: non-numeric price query falls back gracefully @e2e @regression @destructive', async ({
      homePage
    }) => {
      // Act: Open catalog with malformed price query values
      await homePage.gotoWithQuery('minPrice=abc&maxPrice=xyz');

      // Assert: Page remains usable and does not collapse to error state
      expect(await homePage.hasProducts()).toBe(true);
      expect(await homePage.isEmptyStateVisible()).toBe(false);
    });

    test('CAT-N08: whitespace-padded search term returns no results @e2e @regression @destructive', async ({
      homePage
    }) => {
      // Act: Search with leading/trailing spaces directly via query
      await homePage.gotoWithQuery(`q=${encodeURIComponent('  helper  ')}`);

      // Assert: Current behavior treats it as literal text and shows empty state
      await homePage.waitForEmptyState();
    });
  });

  test.describe('edge cases', () => {
    test('CAT-E01: exact price boundary (min=max) is inclusive @e2e @regression @destructive', async ({
      homePage
    }) => {
      const target = seededProducts[1];

      // Act: Filter exact boundary where min == max
      await homePage.goto();
      await homePage.applyPriceFilter(target.price, target.price);

      // Assert: Boundary product is included and all visible prices stay on boundary
      await homePage.waitForProductCardVisible(target.id);
      const prices = await homePage.getVisibleProductPriceValues();
      expect(prices.length).toBeGreaterThan(0);
      for (const price of prices) {
        expect(price).toBeCloseTo(target.price, 2);
      }
    });

    test('CAT-E02: deep-link with combined filters resolves deterministically @e2e @regression @destructive', async ({
      page,
      homePage
    }) => {
      const query =
        `q=${encodeURIComponent(catalogSearch.term)}` +
        `&category=${catalogCategories.automation}` +
        `&sort=${catalogSort.priceDesc}` +
        '&minPrice=100&maxPrice=1000';

      // Act: Load deep-link with all filters already in query
      await homePage.gotoWithQuery(query);

      // Assert: Query state is preserved and results match all constraints
      expect(await homePage.hasProducts()).toBe(true);

      const titles = await homePage.getVisibleProductTitleTexts();
      expect(
        titles.some((title) => title.toLowerCase().includes(catalogSearch.term.toLowerCase()))
      ).toBe(true);

      const prices = await homePage.getVisibleProductPriceValues();
      for (const price of prices) {
        expect(price).toBeGreaterThanOrEqual(100);
        expect(price).toBeLessThanOrEqual(1000);
      }

      await expect(page).toHaveURL(/category=automation/i);
      await expect(page).toHaveURL(/sort=price_desc/i);
    });

    test('CAT-E03: repeated same search remains idempotent @e2e @regression @destructive', async ({
      homePage
    }) => {
      // Act: Run same search twice
      await homePage.goto();
      await homePage.search(catalogSearch.term);
      const firstCount = await homePage.getProductCount();

      await homePage.search(catalogSearch.term);
      const secondCount = await homePage.getProductCount();

      // Assert: Repeating same query keeps same result cardinality
      expect(secondCount).toBe(firstCount);
    });

    test('CAT-E04: filter+sort combination preserves both constraints @e2e @regression @destructive', async ({
      homePage
    }) => {
      // Act: Apply max price filter and descending price sort together
      await homePage.gotoWithQuery(
        `minPrice=0&maxPrice=${catalogPrice.maxAffordable}&sort=${catalogSort.priceDesc}`
      );

      // Assert: Every result is within boundary and sorted descending
      const values = await homePage.getVisibleProductPriceValues();
      expect(values.length).toBeGreaterThan(0);

      const sorted = [...values].sort((a, b) => b - a);
      expect(values).toEqual(sorted);

      for (const value of values) {
        expect(value).toBeLessThanOrEqual(catalogPrice.maxAffordable);
      }
    });
  });
});
