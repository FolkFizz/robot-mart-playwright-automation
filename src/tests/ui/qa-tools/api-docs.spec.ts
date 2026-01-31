import { test, expect } from '@playwright/test';

test.describe('@ui @qa QA Tools - API Docs', () => {
  test('should display API documentation', async ({ page }) => {
    await page.goto('/api-docs');
    
    await expect(page.locator('h1')).toContainText(/api|documentation/i);
  });
});
