import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Product Page', () => {
  test('should match product detail page', async ({ page }) => {
    await page.goto('/');
    
    // Click first product
    const firstProduct = page.locator('[data-testid^="product-card-"]').first();
    await firstProduct.click();
    
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('product-detail.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});
