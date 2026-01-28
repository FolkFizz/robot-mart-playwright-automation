import { test, expect } from '@playwright/test';

test.describe('Public - Sorting', () => {
  test.skip('should sort products', async ({ page }) => {
    // TODO: Implement sorting tests
    await page.goto('/');
  });
});
