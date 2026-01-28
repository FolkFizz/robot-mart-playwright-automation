import { test, expect } from '@playwright/test';

test.describe('Admin - Coupon Management', () => {
  test.skip('should create new coupon', async ({ page }) => {
    // TODO: Implement coupon creation tests
    await page.goto('/admin/coupons');
  });

  test.skip('should delete coupon', async ({ page }) => {
    // TODO: Implement coupon deletion tests
    await page.goto('/admin/coupons');
  });
});
