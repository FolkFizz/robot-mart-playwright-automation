import { test, expect } from '@playwright/test';

test.describe('Shopping - Checkout', () => {
  test.skip('should complete checkout process', async ({ page }) => {
    // TODO: Implement checkout flow tests
    await page.goto('/checkout');
  });
});
