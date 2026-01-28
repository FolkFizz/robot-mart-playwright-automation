import { test, expect } from '@playwright/test';

test.describe('QA Tools - Chaos Widget', () => {
  test.skip('should display chaos widget', async ({ page }) => {
    // TODO: Implement chaos widget tests
    await page.goto('/');
    
    const chaosWidget = page.locator('[data-testid="chaos-widget"]');
    await expect(chaosWidget).toBeVisible();
  });
});
