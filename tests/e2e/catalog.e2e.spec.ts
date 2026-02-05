import { test, expect } from '@fixtures/base.fixture';

import { HomePage } from '@pages/home.page';
import { ProductPage } from '@pages/product.page';
import { seededProducts } from '@data/products';
import { catalogSearch, catalogCategories, catalogSort, catalogPrice } from '@data/catalog';

test.describe('catalog ui @e2e @safe', () => {

  test.describe('positive cases', () => {

    test('home shows main controls @smoke @e2e @safe', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await expect(home.getSearchInput()).toBeVisible();
      await expect(home.getSortSelect()).toBeVisible();
      await expect(home.getCategoryList()).toBeVisible();
    });

    test('search updates URL query @e2e @safe', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.search(catalogSearch.term);
      await expect(page).toHaveURL(new RegExp(`q=${catalogSearch.term}`, 'i'));
    });

    test('sort updates URL query @e2e @safe', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.selectSort(catalogSort.priceDesc);
      await expect(page).toHaveURL(new RegExp(`sort=${catalogSort.priceDesc}`, 'i'));
    });

    test('category selection updates URL @e2e @safe', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.selectCategory(catalogCategories.automation);
      await expect(page).toHaveURL(new RegExp(`category=${catalogCategories.automation}`, 'i'));
    });

    test('price filter updates URL @e2e @safe', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.applyPriceFilter(catalogPrice.min, catalogPrice.max);
      await expect(page).toHaveURL(new RegExp(`minPrice=${catalogPrice.min}`, 'i'));
      await expect(page).toHaveURL(new RegExp(`maxPrice=${catalogPrice.max}`, 'i'));
    });
  });

  test.describe('negative cases', () => {

    test('search with no results shows empty state @e2e @regression @safe', async ({ page }) => {

      const home = new HomePage(page);
      await home.goto();

      await home.search(catalogSearch.noResults);
      await home.waitForEmptyState();
    });

    test('invalid category shows empty state @e2e @regression @safe', async ({ page }) => {
      const home = new HomePage(page);
      await home.gotoWithQuery(`category=${catalogCategories.unknown}`);
      await home.waitForEmptyState();
    });
  });
});

test.describe('catalog seeded @e2e @destructive', () => {
  test.use({ seedData: true });

  test.describe('positive cases', () => {

    test('seeded products visible @smoke @e2e @destructive', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      for (const product of seededProducts) {
        await home.waitForProductCardVisible(product.id);
      }
    });

    test('search is case-insensitive @e2e @destructive', async ({ page }) => {
      const home = new HomePage(page);
      const target = seededProducts[1];

      await home.goto();
      await home.search(target.name.toUpperCase());

      await home.waitForProductCardVisible(target.id);
      const title = await home.getProductCardTitle(target.id);
      expect(title).toContain(target.name);
    });

    test('search by partial term @e2e @destructive', async ({ page }) => {
      const home = new HomePage(page);
      const target = seededProducts[0];

      await home.goto();
      await home.search(catalogSearch.partial);

      await home.waitForProductCardVisible(target.id);
    });

    test('filter by category automation @e2e @destructive', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();
      await home.selectCategory(catalogCategories.automation);

      await home.waitForProductCardVisible(seededProducts[0].id);
      await home.waitForProductCardVisible(seededProducts[1].id);
      expect(await home.isProductCardVisible(seededProducts[2].id)).toBe(false);

      const badgeText = await home.getFirstBadgeText();
      expect(badgeText.toLowerCase()).toContain(catalogCategories.automation);
    });

    test('filter by price max 500 @e2e @destructive', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.applyPriceFilter(0, catalogPrice.maxAffordable);
      await home.waitForProductCardVisible(seededProducts[0].id);
      await home.waitForProductCardVisible(seededProducts[1].id);
      expect(await home.isProductCardVisible(seededProducts[2].id)).toBe(false);
    });

    test('sort by price asc @e2e @destructive', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();
      await home.selectSort(catalogSort.priceAsc);

      const values = await home.getVisibleProductPriceValues();
      expect(values.length).toBeGreaterThan(1);
      const sorted = [...values].sort((a, b) => a - b);
      expect(values).toEqual(sorted);
    });

    test('sort by price desc @e2e @destructive', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();
      await home.selectSort(catalogSort.priceDesc);

      const values = await home.getVisibleProductPriceValues();
      expect(values.length).toBeGreaterThan(1);
      const sorted = [...values].sort((a, b) => b - a);
      expect(values).toEqual(sorted);
    });

    test('sort by name asc @e2e @destructive', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();
      await home.selectSort(catalogSort.nameAsc);

      const names = await home.getVisibleProductTitleTexts();
      expect(names.length).toBeGreaterThan(1);
      const normalized = names.map((n) => n.trim().toLowerCase());
      const sorted = [...normalized].sort();
      expect(normalized).toEqual(sorted);
    });

    test('open product detail by id @e2e @destructive', async ({ page }) => {
      const home = new HomePage(page);
      const product = new ProductPage(page);
      const target = seededProducts[0];

      await home.goto();
      await home.clickProductById(target.id);

      const title = await product.getTitle();
      const priceValue = await product.getPriceValue();

      expect(title).toContain(target.name);
      expect(priceValue).toBeCloseTo(target.price, 2);
    });

    test('open product detail by card click @e2e @destructive', async ({ page }) => {
      const home = new HomePage(page);
      const product = new ProductPage(page);

      await home.goto();
      await home.clickProductByIndex(0);

      const title = await product.getTitle();
      expect(title.length).toBeGreaterThan(0);
      await expect(page).toHaveURL(/\/product\/\d+/);
    });

    test('product card component reads price @e2e @destructive', async ({ page }) => {
      const home = new HomePage(page);
      const target = seededProducts[1];

      await home.goto();
      const value = await home.getProductCardPriceValue(target.id);
      expect(value).toBeCloseTo(target.price, 2);
    });
  });

  test.describe('negative cases', () => {
    
    test('price range min > max shows empty state @e2e @regression @destructive', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.applyPriceFilter(catalogPrice.invalidMin, catalogPrice.invalidMax);
      await home.waitForEmptyState();
    });

    test('search + category mismatch shows empty state @e2e @regression @destructive', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.selectCategory(catalogCategories.highTech);
      await home.search(catalogSearch.partial);

      await home.waitForEmptyState();
    });

    test('search with special chars shows empty state @e2e @regression @destructive', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.search(catalogSearch.specialChars);
      await home.waitForEmptyState();
    });
  });
});
