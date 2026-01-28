import { test, expect } from '@playwright/test';

test.describe('Chatbot - Gemini Integration', () => {
  test.skip('should open chatbot widget', async ({ page }) => {
    // TODO: Implement chatbot tests
    await page.goto('/');
    
    const chatbotButton = page.locator('[data-testid="chatbot-button"]');
    await chatbotButton.click();
  });

  test.skip('should send message to chatbot', async ({ page }) => {
    // TODO: Implement chatbot messaging tests
    await page.goto('/');
  });
});
