import { test, expect } from '@fixtures';
import { disableChaos } from '@api';
import { catalogSearch, seededProducts } from '@data';

/**
 * =============================================================================
 * PRODUCT SEARCH E2E TESTS
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Valid product search returns results
 * 2. Case-insensitive and partial-name matching
 * 3. Empty and no-result search handling
 * 4. Input safety with special characters and long terms
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (3 tests):
 *   - SEARCH-P01: valid search returns matching product card
 *   - SEARCH-P02: search is case-insensitive
 *   - SEARCH-P03: partial name match returns expected product
 *
 * NEGATIVE CASES (2 tests):
 *   - SEARCH-N01: no-result search shows empty state
 *   - SEARCH-N02: empty search returns default unfiltered list
 *
 * EDGE CASES (3 tests):
 *   - SEARCH-E01: special characters are handled safely
 *   - SEARCH-E02: multiple-space term handled as literal input
 *   - SEARCH-E03: very long search term handled gracefully
 *
 * Business Rules:
 * ---------------
 * - Search uses query parameter: ?q=<term>
 * - Search is case-insensitive
 * - Partial-name search works (e.g., "Rusty")
 * - Empty search (q=) returns default catalog listing
 * - Unsafe/special input must not break the page
 *
 * =============================================================================
 */

test.use({ seedData: true });

test.describe('product search @e2e @search', () => {
  test.beforeAll(async () => {
    await disableChaos();
  });

  test.describe('positive cases', () => {
    test('SEARCH-P01: valid search returns matching product card @e2e @search @smoke', async ({
      homePage
    }) => {
      await homePage.gotoWithQuery(`q=${encodeURIComponent(catalogSearch.term)}`);

      expect(await homePage.getProductCount()).toBeGreaterThan(0);
      expect(await homePage.isProductCardVisible(seededProducts[1].id)).toBe(true);
      await expect(homePage.getSearchInput()).toHaveValue(catalogSearch.term);
    });

    test('SEARCH-P02: search is case-insensitive @e2e @search @regression', async ({
      homePage
    }) => {
      await homePage.gotoWithQuery(`q=${encodeURIComponent(catalogSearch.term.toLowerCase())}`);
      const lowerCount = await homePage.getProductCount();

      await homePage.gotoWithQuery(`q=${encodeURIComponent(catalogSearch.term.toUpperCase())}`);
      const upperCount = await homePage.getProductCount();

      expect(lowerCount).toBeGreaterThan(0);
      expect(upperCount).toBeGreaterThan(0);
      expect(upperCount).toBe(lowerCount);
    });

    test('SEARCH-P03: partial name match returns expected product @e2e @search @regression', async ({
      homePage
    }) => {
      await homePage.gotoWithQuery(`q=${encodeURIComponent(catalogSearch.partial)}`);

      expect(await homePage.getProductCount()).toBeGreaterThan(0);
      expect(await homePage.isProductCardVisible(seededProducts[0].id)).toBe(true);
      await homePage.expectProductCardTitleContains(seededProducts[0].id, catalogSearch.partial);
    });
  });

  test.describe('negative cases', () => {
    test('SEARCH-N01: no-result search shows empty state @e2e @search @regression', async ({
      homePage
    }) => {
      await homePage.gotoWithQuery(`q=${encodeURIComponent(catalogSearch.noResults)}`);

      expect(await homePage.getProductCount()).toBe(0);
      expect(await homePage.isEmptyStateVisible()).toBe(true);
    });

    test('SEARCH-N02: empty search returns default unfiltered list @e2e @search @regression', async ({
      homePage
    }) => {
      await homePage.goto();
      const defaultCount = await homePage.getProductCount();
      expect(defaultCount).toBeGreaterThan(0);

      await homePage.gotoWithQuery('q=');
      const emptySearchCount = await homePage.getProductCount();
      expect(emptySearchCount).toBe(defaultCount);
      await expect(homePage.getSearchInput()).toHaveValue('');
    });
  });

  test.describe('edge cases', () => {
    test('SEARCH-E01: special characters are handled safely @e2e @search @regression', async ({
      page,
      homePage
    }) => {
      const dialogs: string[] = [];
      page.on('dialog', async (dialog) => {
        dialogs.push(dialog.message());
        await dialog.dismiss();
      });

      const xssAttempt = '"><script>alert(1)</script>';
      await homePage.gotoWithQuery(`q=${encodeURIComponent(xssAttempt)}`);

      expect(await homePage.isCatalogHeadingVisible()).toBe(true);
      expect(dialogs.length).toBe(0);
      expect(await homePage.getProductCount()).toBe(0);
    });

    test('SEARCH-E02: multiple-space term handled as literal input @e2e @search @regression', async ({
      homePage
    }) => {
      const spacedTerm = `  ${catalogSearch.term}  `;
      await homePage.gotoWithQuery(`q=${encodeURIComponent(spacedTerm)}`);

      await expect(homePage.getSearchInput()).toHaveValue(spacedTerm);
      expect(await homePage.getProductCount()).toBe(0);
      expect(await homePage.isEmptyStateVisible()).toBe(true);
    });

    test('SEARCH-E03: very long search term handled gracefully @e2e @search @regression', async ({
      page,
      homePage
    }) => {
      const longTerm = 'A'.repeat(500);
      await homePage.gotoWithQuery(`q=${encodeURIComponent(longTerm)}`);

      await expect(page).toHaveURL(/\?q=/);
      expect(await homePage.isCatalogHeadingVisible()).toBe(true);
      expect(await homePage.getProductCount()).toBe(0);
      expect(await homePage.isEmptyStateVisible()).toBe(true);
    });
  });
});
