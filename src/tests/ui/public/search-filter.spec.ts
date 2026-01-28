import { test, expect } from '@playwright/test';

test.describe('Public - Search and Filter', () => {
  test('should search for products', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.locator('input[name="q"]');
    await searchInput.fill('robot');
    await searchInput.press('Enter');
    
    await page.waitForLoadState('networkidle');
    const products = page.locator('[data-testid^="product-card-"]');
    await expect(products.first()).toBeVisible();
  });
});
