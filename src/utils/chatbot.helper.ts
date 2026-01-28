import { Page, Locator, expect } from '@playwright/test';

/**
 * A helper class for interacting with the Gemini Chatbot widget.
 * It encapsulates actions like sending messages and reading responses.
 */
export class ChatbotHelper {
  private static readonly CHATBOT_WIDGET_SELECTOR = '.chatbot-widget, #chatbot';
  private static readonly CHAT_OPEN_BUTTON_SELECTOR = '.chat-toggle, .open-chat';
  private static readonly MESSAGE_INPUT_SELECTOR = 'input[placeholder*="message"], textarea[placeholder*="message"]';
  private static readonly SEND_BUTTON_SELECTOR = 'button:has-text("Send")';
  private static readonly MESSAGE_SELECTOR = '.chat-message, .message';
  private static readonly BOT_RESPONSE_SELECTOR = '.chat-message.bot, .message.bot'; // Assuming bot messages have a .bot class
  private static readonly TYPING_INDICATOR_SELECTOR = '.typing-indicator, .is-typing';

  /**
   * Opens the chat widget if it's not already visible, then sends a message.
   * Throws an error if the chat components cannot be found.
   * @param page - The Playwright Page object.
   * @param message - The message text to send.
   */
  static async sendMessage(page: Page, message: string): Promise<void> {
    const openButton = page.locator(this.CHAT_OPEN_BUTTON_SELECTOR);
    const chatWidget = page.locator(this.CHATBOT_WIDGET_SELECTOR);

    if (!await chatWidget.isVisible()) {
      await expect(openButton, 'Chatbot open button must be visible to start a conversation.').toBeVisible();
      await openButton.click();
    }
    
    await expect(chatWidget, 'Chatbot widget must be visible after clicking the open button.').toBeVisible();

    const messageInput = page.locator(this.MESSAGE_INPUT_SELECTOR);
    const sendButton = page.locator(this.SEND_BUTTON_SELECTOR);

    await expect(messageInput, 'Chatbot message input must be visible.').toBeVisible();
    await expect(sendButton, 'Chatbot send button must be visible.').toBeEnabled();

    await messageInput.fill(message);
    await sendButton.click();
  }

  /**
   * Waits for the typing indicator to disappear and for a new bot response to appear.
   * Then it returns the text content of the latest bot response.
   * @param page - The Playwright Page object.
   * @returns The text of the last message from the bot.
   */
  static async getLastResponse(page: Page): Promise<string> {
    await this.waitForResponse(page);
    
    const lastBotResponse = page.locator(this.BOT_RESPONSE_SELECTOR).last();
    await expect(lastBotResponse, 'A bot response message should be available.').toBeVisible();
    
    const textContent = await lastBotResponse.textContent();
    if (textContent === null) {
      throw new Error('Could not retrieve text content from the last bot response.');
    }
    return textContent;
  }

  /**
   * Waits for the chatbot to finish "typing".
   * This is achieved by waiting for a typing indicator to disappear and for a new message to be added to the DOM.
   * @param page - The Playwright Page object.
   */
  static async waitForResponse(page: Page): Promise<void> {
    const typingIndicator = page.locator(this.TYPING_INDICATOR_SELECTOR);
    
    // Wait for the indicator to show up first (optional, but good for reliability)
    await expect(typingIndicator.first()).toBeVisible({ timeout: 5000 }).catch(() => {
        // If it doesn't appear, that's okay, maybe the response was instant.
    });

    // Then wait for it to disappear
    await expect(typingIndicator.first()).not.toBeVisible({ timeout: 15000 });

    // As a final check, ensure at least one bot message exists
    await expect(page.locator(this.BOT_RESPONSE_SELECTOR).first()).toBeVisible();
  }
}