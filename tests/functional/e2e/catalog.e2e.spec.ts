import { test as baseTest, expect } from '@playwright/test';
import { test as dataTest } from '@fixtures/data.fixture';

import { HomePage } from '@pages/home.page';
import { ProductPage } from '@pages/product.page';
import { ProductCardComponent } from '@components/product-card.component';
import { seededProducts } from '../../_support/test-data/products';

const parsePrice = (text: string) => Number.parseFloat(text.replace(/[^0-9.]/g, ''));

baseTest.describe('catalog ui @e2e @safe', () => {

  baseTest.describe('positive cases', () => {

    baseTest('home shows main controls @smoke @e2e', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await expect(home.getSearchInput()).toBeVisible();
      await expect(home.getSortSelect()).toBeVisible();
      await expect(home.getCategoryList()).toBeVisible();
    });

    baseTest('search updates URL query @e2e', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.search('helper');
      await expect(page).toHaveURL(/q=helper/i);
    });

    baseTest('sort updates URL query @e2e', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.selectSort('price_desc');
      await expect(page).toHaveURL(/sort=price_desc/i);
    });

    baseTest('category selection updates URL @e2e', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.selectCategory('automation');
      await expect(page).toHaveURL(/category=automation/i);
    });

    baseTest('price filter updates URL @e2e', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.applyPriceFilter(100, 1000);
      await expect(page).toHaveURL(/minPrice=100/i);
      await expect(page).toHaveURL(/maxPrice=1000/i);
    });
  });

  baseTest.describe('negative cases', () => {

    baseTest('search with no results shows empty state @e2e @regression', async ({ page }) => {

      const home = new HomePage(page);
      await home.goto();

      await home.search('no_such_robot_zzzz');
      await home.waitForEmptyState();
    });

    baseTest('invalid category shows empty state @e2e @regression', async ({ page }) => {
      const home = new HomePage(page);
      await home.gotoWithQuery('category=unknown_category');
      await home.waitForEmptyState();
    });
  });
});

dataTest.describe('catalog seeded @e2e @destructive', () => {

  dataTest.describe('positive cases', () => {

    dataTest('seeded products visible @smoke @e2e', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      for (const product of seededProducts) {
        const card = new ProductCardComponent(page, product.id);
        await card.waitForVisible();
      }
    });

    dataTest('search is case-insensitive @e2e', async ({ page }) => {
      const home = new HomePage(page);
      const target = seededProducts[1];

      await home.goto();
      await home.search(target.name.toUpperCase());

      const card = new ProductCardComponent(page, target.id);
      await card.waitForVisible();
      const title = await card.getTitle();
      expect(title).toContain(target.name);
    });

    dataTest('search by partial term @e2e', async ({ page }) => {
      const home = new HomePage(page);
      const target = seededProducts[0];

      await home.goto();
      await home.search('Rusty');

      const card = new ProductCardComponent(page, target.id);
      await card.waitForVisible();
    });

    dataTest('filter by category automation @e2e', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();
      await home.selectCategory('automation');

      const automationCard1 = new ProductCardComponent(page, seededProducts[0].id);
      const automationCard2 = new ProductCardComponent(page, seededProducts[1].id);
      const highTechCard = new ProductCardComponent(page, seededProducts[2].id);

      await automationCard1.waitForVisible();
      await automationCard2.waitForVisible();
      expect(await highTechCard.isVisible()).toBe(false);

      const badgeText = await home.getFirstBadgeText();
      expect(badgeText.toLowerCase()).toContain('automation');
    });

    dataTest('filter by price max 500 @e2e', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.applyPriceFilter(0, 500);
      const affordableCard1 = new ProductCardComponent(page, seededProducts[0].id);
      const affordableCard2 = new ProductCardComponent(page, seededProducts[1].id);
      const expensiveCard = new ProductCardComponent(page, seededProducts[2].id);

      await affordableCard1.waitForVisible();
      await affordableCard2.waitForVisible();
      expect(await expensiveCard.isVisible()).toBe(false);
    });

    dataTest('sort by price asc @e2e', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();
      await home.selectSort('price_asc');

      const prices = await home.getVisibleProductPriceTexts();
      expect(prices.length).toBeGreaterThan(1);
      const values = prices.map(parsePrice);
      const sorted = [...values].sort((a, b) => a - b);
      expect(values).toEqual(sorted);
    });

    dataTest('sort by price desc @e2e', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();
      await home.selectSort('price_desc');

      const prices = await home.getVisibleProductPriceTexts();
      expect(prices.length).toBeGreaterThan(1);
      const values = prices.map(parsePrice);
      const sorted = [...values].sort((a, b) => b - a);
      expect(values).toEqual(sorted);
    });

    dataTest('sort by name asc @e2e', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();
      await home.selectSort('name_asc');

      const names = await home.getVisibleProductTitleTexts();
      expect(names.length).toBeGreaterThan(1);
      const normalized = names.map((n) => n.trim().toLowerCase());
      const sorted = [...normalized].sort();
      expect(normalized).toEqual(sorted);
    });

    dataTest('open product detail by id @e2e', async ({ page }) => {
      const home = new HomePage(page);
      const product = new ProductPage(page);
      const target = seededProducts[0];

      await home.goto();
      await home.clickProductById(target.id);

      const title = await product.getTitle();
      const priceText = await product.getPrice();

      expect(title).toContain(target.name);
      expect(parsePrice(priceText)).toBeCloseTo(target.price, 2);
    });

    dataTest('open product detail by card click @e2e', async ({ page }) => {
      const home = new HomePage(page);
      const product = new ProductPage(page);

      await home.goto();
      await home.clickProductByIndex(0);

      const title = await product.getTitle();
      expect(title.length).toBeGreaterThan(0);
      await expect(page).toHaveURL(/\/product\/\d+/);
    });

    dataTest('product card component reads price @e2e', async ({ page }) => {
      const home = new HomePage(page);
      const target = seededProducts[1];

      await home.goto();
      const card = new ProductCardComponent(page, target.id);
      const value = await card.getPriceValue();
      expect(value).toBeCloseTo(target.price, 2);
    });
  });

  dataTest.describe('negative cases', () => {
    
    dataTest('price range min > max shows empty state @e2e @regression', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.applyPriceFilter(2000, 100);
      await home.waitForEmptyState();
    });

    dataTest('search + category mismatch shows empty state @e2e @regression', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.selectCategory('high_tech');
      await home.search('Rusty');

      await home.waitForEmptyState();
    });

    dataTest('search with special chars shows empty state @e2e @regression', async ({ page }) => {
      const home = new HomePage(page);
      await home.goto();

      await home.search('@@@###');
      await home.waitForEmptyState();
    });
  });
});
