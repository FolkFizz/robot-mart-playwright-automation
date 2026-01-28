import { test, expect } from '@playwright/test';

test.describe('Public - Price Filter', () => {
  test.skip('should filter by price range', async ({ page }) => {
    // TODO: Implement price filter tests
    await page.goto('/');
  });
});
