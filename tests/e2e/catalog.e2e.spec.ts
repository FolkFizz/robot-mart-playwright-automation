import { test, expect } from '@fixtures';
import { seededProducts, catalogSearch, catalogCategories, catalogSort, catalogPrice } from '@data';

test.describe('catalog ui @e2e @safe', () => {

  test.describe('positive cases', () => {

    test('home shows main controls @smoke @e2e @safe', async ({ homePage }) => {
      await homePage.goto();

      await expect(homePage.getSearchInput()).toBeVisible();
      await expect(homePage.getSortSelect()).toBeVisible();
      await expect(homePage.getCategoryList()).toBeVisible();
    });

    test('search updates URL query @e2e @safe', async ({ page, homePage }) => {
      await homePage.goto();

      await homePage.search(catalogSearch.term);
      await expect(page).toHaveURL(new RegExp(`q=${catalogSearch.term}`, 'i'));
    });

    test('sort updates URL query @e2e @safe', async ({ page, homePage }) => {
      await homePage.goto();

      await homePage.selectSort(catalogSort.priceDesc);
      await expect(page).toHaveURL(new RegExp(`sort=${catalogSort.priceDesc}`, 'i'));
    });

    test('category selection updates URL @e2e @safe', async ({ page, homePage }) => {
      await homePage.goto();

      await homePage.selectCategory(catalogCategories.automation);
      await expect(page).toHaveURL(new RegExp(`category=${catalogCategories.automation}`, 'i'));
    });

    test('price filter updates URL @e2e @safe', async ({ page, homePage }) => {
      await homePage.goto();

      await homePage.applyPriceFilter(catalogPrice.min, catalogPrice.max);
      await expect(page).toHaveURL(new RegExp(`minPrice=${catalogPrice.min}`, 'i'));
      await expect(page).toHaveURL(new RegExp(`maxPrice=${catalogPrice.max}`, 'i'));
    });
  });

  test.describe('negative cases', () => {

    test('search with no results shows empty state @e2e @regression @safe', async ({ homePage }) => {
      await homePage.goto();

      await homePage.search(catalogSearch.noResults);
      await homePage.waitForEmptyState();
    });

    test('invalid category shows empty state @e2e @regression @safe', async ({ homePage }) => {
      await homePage.gotoWithQuery(`category=${catalogCategories.unknown}`);
      await homePage.waitForEmptyState();
    });
  });
});

test.describe('catalog seeded @e2e @destructive', () => {
  test.use({ seedData: true });

  test.describe('positive cases', () => {

    test('seeded products visible @smoke @e2e @destructive', async ({ homePage }) => {
      await homePage.goto();

      for (const product of seededProducts) {
        await homePage.waitForProductCardVisible(product.id);
      }
    });

    test('search is case-insensitive @e2e @destructive', async ({ homePage }) => {
      const target = seededProducts[1];

      await homePage.goto();
      await homePage.search(target.name.toUpperCase());

      await homePage.waitForProductCardVisible(target.id);
      const title = await homePage.getProductCardTitle(target.id);
      expect(title).toContain(target.name);
    });

    test('search by partial term @e2e @destructive', async ({ homePage }) => {
      const target = seededProducts[0];

      await homePage.goto();
      await homePage.search(catalogSearch.partial);

      await homePage.waitForProductCardVisible(target.id);
    });

    test('filter by category automation @e2e @destructive', async ({ homePage }) => {
      await homePage.goto();
      await homePage.selectCategory(catalogCategories.automation);

      await homePage.waitForProductCardVisible(seededProducts[0].id);
      await homePage.waitForProductCardVisible(seededProducts[1].id);
      expect(await homePage.isProductCardVisible(seededProducts[2].id)).toBe(false);

      const badgeText = await homePage.getFirstBadgeText();
      expect(badgeText.toLowerCase()).toContain(catalogCategories.automation);
    });

    test('filter by price max 500 @e2e @destructive', async ({ homePage }) => {
      await homePage.goto();

      await homePage.applyPriceFilter(0, catalogPrice.maxAffordable);
      await homePage.waitForProductCardVisible(seededProducts[0].id);
      await homePage.waitForProductCardVisible(seededProducts[1].id);
      expect(await homePage.isProductCardVisible(seededProducts[2].id)).toBe(false);
    });

    test('sort by price asc @e2e @destructive', async ({ homePage }) => {
      await homePage.goto();
      await homePage.selectSort(catalogSort.priceAsc);

      const values = await homePage.getVisibleProductPriceValues();
      expect(values.length).toBeGreaterThan(1);
      const sorted = [...values].sort((a, b) => a - b);
      expect(values).toEqual(sorted);
    });

    test('sort by price desc @e2e @destructive', async ({ homePage }) => {
      await homePage.goto();
      await homePage.selectSort(catalogSort.priceDesc);

      const values = await homePage.getVisibleProductPriceValues();
      expect(values.length).toBeGreaterThan(1);
      const sorted = [...values].sort((a, b) => b - a);
      expect(values).toEqual(sorted);
    });

    test('sort by name asc @e2e @destructive', async ({ homePage }) => {
      await homePage.goto();
      await homePage.selectSort(catalogSort.nameAsc);

      const names = await homePage.getVisibleProductTitleTexts();
      expect(names.length).toBeGreaterThan(1);
      const normalized = names.map((n: string) => n.trim().toLowerCase());
      const sorted = [...normalized].sort();
      expect(normalized).toEqual(sorted);
    });

    test('open product detail by id @e2e @destructive', async ({ homePage, productPage }) => {
      const target = seededProducts[0];

      await homePage.goto();
      await homePage.clickProductById(target.id);

      const title = await productPage.getTitle();
      const priceValue = await productPage.getPriceValue();

      expect(title).toContain(target.name);
      expect(priceValue).toBeCloseTo(target.price, 2);
    });

    test('open product detail by card click @e2e @destructive', async ({ page, homePage, productPage }) => {
      await homePage.goto();
      await homePage.clickProductByIndex(0);

      const title = await productPage.getTitle();
      expect(title.length).toBeGreaterThan(0);
      await expect(page).toHaveURL(/\/product\/\d+/);
    });

    test('product card component reads price @e2e @destructive', async ({ homePage }) => {
      const target = seededProducts[1];

      await homePage.goto();
      const value = await homePage.getProductCardPriceValue(target.id);
      expect(value).toBeCloseTo(target.price, 2);
    });
  });

  test.describe('negative cases', () => {
    
    test('price range min > max shows empty state @e2e @regression @destructive', async ({ homePage }) => {
      await homePage.goto();

      await homePage.applyPriceFilter(catalogPrice.invalidMin, catalogPrice.invalidMax);
      await homePage.waitForEmptyState();
    });

    test('search + category mismatch shows empty state @e2e @regression @destructive', async ({ homePage }) => {
      await homePage.goto();

      await homePage.selectCategory(catalogCategories.highTech);
      await homePage.search(catalogSearch.partial);

      await homePage.waitForEmptyState();
    });

    test('search with special chars shows empty state @e2e @regression @destructive', async ({ homePage }) => {
      await homePage.goto();

      await homePage.search(catalogSearch.specialChars);
      await homePage.waitForEmptyState();
    });
  });
});
