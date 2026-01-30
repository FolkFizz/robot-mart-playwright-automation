import { test, expect } from '@playwright/test';

test.describe('QA Tools - Tester Guide', () => {
  test('should display tester guide page', async ({ page }) => {
    await page.goto('/for-testers');
    
    await expect(page.locator('h1')).toContainText(/tester|guide/i);
  });
});
