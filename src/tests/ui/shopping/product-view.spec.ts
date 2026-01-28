import { test, expect } from '@playwright/test';

test.describe('@smoke Shopping - Product Browsing', () => {
  test('should display products on homepage', async ({ page }) => {
    await page.goto('/');
    
    const products = page.locator('[data-testid^="product-card-"]');
    await expect(products.first()).toBeVisible();
    
    const count = await products.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should navigate to product detail', async ({ page }) => {
    await page.goto('/');
    
    const firstProduct = page.locator('[data-testid^="product-card-"]').first();
    await firstProduct.click();
    
    await expect(page).toHaveURL(/\/product\//);
  });
});
