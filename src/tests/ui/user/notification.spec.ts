import { test, expect } from '@playwright/test';

test.describe('User - Notifications', () => {
  test.skip('should display user notifications', async ({ page }) => {
    // TODO: Implement notification tests
    await page.goto('/profile/notifications');
  });
});
