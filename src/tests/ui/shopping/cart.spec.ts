import { test, expect } from '@playwright/test';

test.describe('Shopping - Cart', () => {
  test.skip('should add product to cart', async ({ page }) => {
    // TODO: Implement cart functionality tests
    await page.goto('/');
  });

  test.skip('should update cart quantity', async ({ page }) => {
    // TODO: Implement quantity update tests
    await page.goto('/cart');
  });
});
