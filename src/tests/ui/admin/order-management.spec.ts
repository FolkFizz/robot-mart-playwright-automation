import { test, expect } from '@playwright/test';

test.describe('Admin - Order Management', () => {
  test.skip('should list all orders', async ({ page }) => {
    // TODO: Implement order management tests
    await page.goto('/admin/orders');
  });

  test.skip('should update order status', async ({ page }) => {
    // TODO: Implement order status update tests
    await page.goto('/admin/orders');
  });
});
