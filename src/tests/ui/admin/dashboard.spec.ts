import { test, expect } from '@playwright/test';

test.describe('Admin - Dashboard', () => {
  test.skip('should display admin dashboard', async ({ page }) => {
    // TODO: Implement admin dashboard tests
    // Requires admin authentication
    await page.goto('/admin');
  });

  test.skip('should show statistics', async ({ page }) => {
    // TODO: Implement statistics tests
    await page.goto('/admin');
  });
});
