import { test, expect } from '@playwright/test';
import { ProductListPage } from '../../../pages/public/product-list.page';

test.describe('Public - Search and Filter', () => {
  test('should search for products and find results', async ({ page }) => {
    const productListPage = new ProductListPage(page);
    await productListPage.goto();
    
    await productListPage.search('robot');
    
    const productCount = await productListPage.getProductCount();
    expect(productCount).toBeGreaterThan(0);
  });

  test('should show no results for a nonsense search', async ({ page }) => {
    const productListPage = new ProductListPage(page);
    await productListPage.goto();

    await productListPage.search('__nonsense_search_term__');

    await expect(productListPage.emptyResultsMessage).toBeVisible();
    const productCount = await productListPage.getProductCount();
    expect(productCount).toBe(0);
  });
});
