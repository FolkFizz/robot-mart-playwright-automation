import {test, expect } from '@fixtures';
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
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (15 tests):
 *   - CAT-P01: Home shows main controls (search, sort, category)
 *   - CAT-P02: Search updates URL query parameter
 *   - CAT-P03: Sort updates URL query
 *   - CAT-P04: Category selection updates URL
 *   - CAT-P05: Price filter updates URL with min/max
 *   - CAT-P06: Seeded products visible on home
 *   - CAT-P07: Search is case-insensitive
 *   - CAT-P08: Search by partial term matches products
 *   - CAT-P09: Filter by category automation shows relevant products
 *   - CAT-P10: Filter by price max shows affordable products
 *   - CAT-P11: Sort by price ascending works correctly
 *   - CAT-P12: Sort by price descending works correctly
 *   - CAT-P13: Sort by name ascending alphabetically
 *   - CAT-P14: Open product detail by clicking card
 *   - CAT-P15: Product card displays correct price
 * 
 * NEGATIVE CASES (5 tests):
 *   - CAT-N01: Search with no results shows empty state
 *   - CAT-N02: Invalid category shows empty state
 *   - CAT-N03: Price range min > max shows empty state
 *   - CAT-N04: Search + category mismatch shows empty state
 *   - CAT-N05: Search with special characters handles gracefully
 * 
 * EDGE CASES (0 tests):
 *   - (Covered in positive/negative cases)
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

test.describe('catalog ui @e2e @safe', () => {

  test.describe('positive cases - UI controls', () => {

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
  });

  test.describe('negative cases - empty states', () => {

    test('CAT-N01: search with no results shows empty state @e2e @regression @safe', async ({ homePage }) => {
      // Act: Search for non-existent product
      await homePage.goto();
      await homePage.search(catalogSearch.noResults);

      // Assert: Empty state displayed
      await homePage.waitForEmptyState();
    });

    test('CAT-N02: invalid category shows empty state @e2e @regression @safe', async ({ homePage }) => {
      // Act: Navigate to invalid category
      await homePage.gotoWithQuery(`category=${catalogCategories.unknown}`);

      // Assert: Empty state displayed
      await homePage.waitForEmptyState();
    });
  });
});

test.use({ seedData: true });

test.describe('catalog with seeded data @e2e @destructive', () => {

  test.describe('positive cases - search and filter', () => {

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
      // Act: Apply price filter (max ฿500)
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

    test('CAT-P14: open product detail by clicking card @e2e @destructive', async ({ page, homePage, productPage }) => {
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

  test.describe('negative cases - filter combinations', () => {
    
    test('CAT-N03: price range min > max shows empty state @e2e @regression @destructive', async ({ homePage }) => {
      // Act: Apply invalid price range
      await homePage.goto();
      await homePage.applyPriceFilter(catalogPrice.invalidMin, catalogPrice.invalidMax);

      // Assert: Empty state (no products match)
      await homePage.waitForEmptyState();
    });

    test('CAT-N04: search + category mismatch shows empty state @e2e @regression @destructive', async ({ homePage }) => {
      // Act: Combine incompatible filters
      await homePage.goto();
      await homePage.selectCategory(catalogCategories.highTech);
      await homePage.search(catalogSearch.partial); // Searches for automation product

      // Assert: Empty state (no match)
      await homePage.waitForEmptyState();
    });

    test('CAT-N05: search with special chars shows empty state @e2e @regression @destructive', async ({ homePage }) => {
      // Act: Search with special characters
      await homePage.goto();
      await homePage.search(catalogSearch.specialChars);

      // Assert: Graceful handling (empty state)
      await homePage.waitForEmptyState();
    });
  });
});
