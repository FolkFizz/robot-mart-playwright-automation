import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

export type ChatSubmitMode = 'click' | 'enter';

export class ChatWidgetPage extends BasePage {
  private readonly toggleButton: Locator;
  private readonly chatWindow: Locator;
  private readonly closeButton: Locator;
  private readonly input: Locator;
  private readonly sendButton: Locator;
  private readonly userMessages: Locator;
  private readonly botMessages: Locator;

  constructor(page: Page) {
    super(page);
    this.toggleButton = this.page.locator('.chat-toggle');
    this.chatWindow = this.page.locator('#chat-window');
    this.closeButton = this.page.locator('#chat-window .chat-header span:last-child');
    this.input = this.page.locator('#user-input');
    this.sendButton = this.page.locator('#send-btn');
    this.userMessages = this.page.locator('#chat-messages .message.user');
    this.botMessages = this.page.locator('#chat-messages .message.bot');
  }

  async expectToggleVisible(): Promise<void> {
    await expect(this.toggleButton).toBeVisible();
  }

  async expectWindowHidden(): Promise<void> {
    await expect(this.chatWindow).toBeHidden();
  }

  async expectWindowVisible(): Promise<void> {
    await expect(this.chatWindow).toBeVisible();
  }

  async open(): Promise<void> {
    await this.toggleButton.click();
    await this.expectWindowVisible();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await this.expectWindowHidden();
  }

  async sendMessage(message: string, mode: ChatSubmitMode = 'click'): Promise<void> {
    await this.input.fill(message);
    if (mode === 'enter') {
      await this.input.press('Enter');
      return;
    }
    await this.sendButton.click();
  }

  async getUserMessageCount(): Promise<number> {
    return await this.userMessages.count();
  }

  async getBotMessageCount(): Promise<number> {
    return await this.botMessages.count();
  }

  async expectLatestUserMessageContains(text: string, timeoutMs = 10_000): Promise<void> {
    await expect(this.userMessages.last()).toContainText(text, { timeout: timeoutMs });
  }

  async waitForBotReplyAfterUserMessage(userText: string): Promise<string> {
    const botCountBefore = await this.getBotMessageCount();
    await this.expectLatestUserMessageContains(userText);
    await expect
      .poll(async () => await this.getBotMessageCount(), { timeout: 30_000 })
      .toBeGreaterThan(botCountBefore);
    return await this.getLatestBotMessageText();
  }

  async getLatestBotMessageText(): Promise<string> {
    return await this.botMessages.last().innerText();
  }

  async expectLatestBotMessageContains(text: string, timeoutMs = 10_000): Promise<void> {
    await expect(this.botMessages.last()).toContainText(text, { timeout: timeoutMs });
  }

  async expectInputCleared(): Promise<void> {
    await expect(this.input).toHaveValue('');
  }

  async expectFirstBotMessageVisible(): Promise<void> {
    await expect(this.botMessages.first()).toBeVisible();
  }
}

