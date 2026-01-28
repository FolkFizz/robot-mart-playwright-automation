import { test, expect } from '@playwright/test';

test.describe('QA Tools - Chaos Lab', () => {
  test.skip('should access chaos lab', async ({ page }) => {
    // TODO: Implement chaos lab tests
    await page.goto('/chaos-lab');
  });
});
