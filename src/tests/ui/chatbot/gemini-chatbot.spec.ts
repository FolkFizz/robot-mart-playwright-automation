import { test, expect } from '@playwright/test';
import { ChatbotHelper } from '../../../utils/chatbot.helper';

test.describe('@ui @chatbot Chatbot - Gemini Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open chatbot, send a message, and receive a reply', async ({ page }) => {
    // Send a message using the helper
    await ChatbotHelper.sendMessage(page, 'Hello Robot');
    
    // Wait for the response and get the last message from the bot
    const response = await ChatbotHelper.getLastResponse(page);
    
    // Assert that we got a coherent response
    expect(response).not.toBeNull();
    expect(response.length).toBeGreaterThan(0);
    expect(response.toLowerCase()).toContain('hello');
  });

  test('should handle a conversation flow about products', async ({ page }) => {
    // Ask the chatbot a question about a specific product
    await ChatbotHelper.sendMessage(page, 'Tell me about your most expensive robot');
    
    // Get the response
    const response = await ChatbotHelper.getLastResponse(page);

    // Assert that the response is relevant to products or purchasing
    expect(response.toLowerCase()).toMatch(/expensive|product|robot|buy|price/);
    
    // Follow-up question
    await ChatbotHelper.sendMessage(page, 'How can I buy it?');
    const finalResponse = await ChatbotHelper.getLastResponse(page);
    
    // Assert that the chatbot provides guidance on purchasing
    expect(finalResponse.toLowerCase()).toMatch(/cart|checkout|buy|purchase/);
  });
});
