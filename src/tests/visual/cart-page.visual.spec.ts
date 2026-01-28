import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Cart Page', () => {
  test('should match empty cart page', async ({ page }) => {
    await page.goto('/cart');
    await expect(page).toHaveScreenshot('cart-empty.png', {
      fullPage: true,
      maxDiffPixels: 50,
    });
  });
});
