import { test, expect } from '@playwright/test';
import { CatalogPage } from '../../../pages/shopping/product-list.page';

test.describe('Public - Search and Filter', () => {
  test('should search for products and find results', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();
    
    await catalogPage.search('robot');
    
    const productCount = await catalogPage.getProductCount();
    expect(productCount).toBeGreaterThan(0);
  });

  test('should show no results for a nonsense search', async ({ page }) => {
    const catalogPage = new CatalogPage(page);
    await catalogPage.goto();

    await catalogPage.search('__nonsense_search_term__');

    await expect(catalogPage.emptyResultsMessage).toBeVisible();
    const productCount = await catalogPage.getProductCount();
    expect(productCount).toBe(0);
  });
});