import { test, expect } from '@playwright/test';

test.describe('Public - Category Filter', () => {
  test.skip('should filter by category', async ({ page }) => {
    // TODO: Implement category filter tests
    await page.goto('/?category=robots');
  });
});
