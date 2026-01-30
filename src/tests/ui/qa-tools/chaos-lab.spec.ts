import { test, expect } from '@playwright/test';
import { ChaosHelper } from '../../../utils/chaos.helper';
import { ProductListPage } from '../../../pages/public/product-list.page';

test.describe('QA Tools - Chaos Lab', () => {
  let productListPage: ProductListPage;

  test.beforeEach(async ({ page }) => {
    productListPage = new ProductListPage(page);
  });

  test('should survive and function correctly under high network latency', async ({ page }) => {
    // Simulate a 3-second network delay for all requests
    await ChaosHelper.simulateNetworkLatency(page, 3000);
    
    await productListPage.goto('/');

    const startTime = Date.now();
    await productListPage.search('Bender');
    const duration = Date.now() - startTime;

    // Assert that the page correctly displays the search result despite the delay
    await expect(productListPage.productCards.first()).toBeVisible();
    await expect(productListPage.productTitles.first()).toContainText('Bender');

    // Assert that the operation took at least as long as the simulated latency
    expect(duration).toBeGreaterThanOrEqual(3000);
  });

  test('should handle browser offline mode gracefully', async ({ page }) => {
    await productListPage.goto('/');
    
    // Ensure the page is loaded before going offline
    await expect(productListPage.productCards.first()).toBeVisible();

    // Simulate going offline
    await ChaosHelper.simulateOfflineMode(page);
    
    // Attempting to navigate or reload should now fail.
    // We expect Playwright's navigation to throw an error, which proves the offline mode is active.
    // The exact error message varies by browser (e.g., net::ERR_INTERNET_DISCONNECTED).
    await expect(page.reload()).rejects.toThrow();
  });
});
