import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class GeminiChatbotPage extends BasePage {
  readonly chatWidget: Locator;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly chatMessages: Locator;
  readonly closeButton: Locator;

  constructor(page: Page) {
    super(page);
    
    this.chatWidget = page.locator('.chatbot-widget, #chatbot');
    this.chatInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]');
    this.sendButton = page.locator('button:has-text("Send")');
    this.chatMessages = page.locator('.chat-message, .message');
    this.closeButton = page.locator('button:has-text("Close"), .close-chat');
  }

  async goto() {
    await this.page.goto('/');
  }

  async openChat() {
    if (!await this.chatWidget.isVisible()) {
      await this.page.locator('.chat-toggle, .open-chat').click();
    }
  }

  async sendMessage(message: string) {
    await this.chatInput.fill(message);
    await this.sendButton.click();
  }

  async getLastMessage(): Promise<string> {
    return await this.chatMessages.last().textContent() || '';
  }

  async closeChat() {
    await this.closeButton.click();
  }
}
