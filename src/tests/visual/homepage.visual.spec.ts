import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Homepage', () => {
  test('should match homepage screenshot', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should match homepage hero section', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('.hero, .banner').first();
    await expect(hero).toHaveScreenshot('homepage-hero.png');
  });
});
