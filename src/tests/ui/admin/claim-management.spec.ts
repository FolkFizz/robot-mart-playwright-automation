import { test, expect } from '@playwright/test';

test.describe('Admin - Claim Management', () => {
  test.skip('should list warranty claims', async ({ page }) => {
    // TODO: Implement claim management tests
    await page.goto('/admin/claims');
  });

  test.skip('should approve claim', async ({ page }) => {
    // TODO: Implement claim approval tests
    await page.goto('/admin/claims');
  });
});
