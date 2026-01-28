import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Checkout Page', () => {
  test.skip('should match checkout page', async ({ page }) => {
    // TODO: Implement after cart functionality is ready
    await page.goto('/checkout');
    await expect(page).toHaveScreenshot('checkout.png', {
      fullPage: true,
    });
  });
});
