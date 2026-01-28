import { test, expect } from '@playwright/test';
import { ChaosHelper } from '../../../utils/chaos.helper';
import { CatalogPage } from '../../../pages/shopping/product-list.page';

test.describe('QA Tools - Chaos Lab', () => {
  let catalogPage: CatalogPage;

  test.beforeEach(async ({ page }) => {
    catalogPage = new CatalogPage(page);
  });

  test('should survive and function correctly under high network latency', async ({ page }) => {
    // Simulate a 3-second network delay for all requests
    await ChaosHelper.simulateNetworkLatency(page, 3000);
    
    await catalogPage.goto('/');

    const startTime = Date.now();
    await catalogPage.search('Bender');
    const duration = Date.now() - startTime;

    // Assert that the page correctly displays the search result despite the delay
    await expect(catalogPage.productCards.first()).toBeVisible();
    await expect(catalogPage.productTitles.first()).toContainText('Bender');

    // Assert that the operation took at least as long as the simulated latency
    expect(duration).toBeGreaterThanOrEqual(3000);
  });

  test('should handle browser offline mode gracefully', async ({ page }) => {
    await catalogPage.goto('/');
    
    // Ensure the page is loaded before going offline
    await expect(catalogPage.productCards.first()).toBeVisible();

    // Simulate going offline
    await ChaosHelper.simulateOfflineMode(page);
    
    // Attempting to navigate or reload should now fail.
    // We expect Playwright's navigation to throw an error, which proves the offline mode is active.
    // The exact error message varies by browser (e.g., net::ERR_INTERNET_DISCONNECTED).
    await expect(page.reload()).rejects.toThrow();
  });
});