import { test, expect } from '@playwright/test';

test.describe.skip('Visual Regression Tests', () => {
  test('visual snapshot test', async ({ page }) => {
    // TODO: Implement visual regression test
    await page.goto('/');
    await expect(page).toHaveScreenshot();
  });
});
