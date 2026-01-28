import { test, expect } from '@playwright/test';

test.describe('Admin - Stock Reset', () => {
  test.skip('should reset stock to default', async ({ page }) => {
    // TODO: Implement stock reset tests
    await page.goto('/admin/stock-reset');
  });
});
