import { test, expect } from '@playwright/test';

test.describe.skip('Performance Tests', () => {
  test('performance test', async ({ page }) => {
    // TODO: Implement performance test
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000);
  });
});
