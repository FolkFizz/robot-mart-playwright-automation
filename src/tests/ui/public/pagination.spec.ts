import { test, expect } from '@playwright/test';

test.describe('Public - Pagination', () => {
  test.skip('should paginate through products', async ({ page }) => {
    // TODO: Implement pagination tests
    await page.goto('/');
  });
});
