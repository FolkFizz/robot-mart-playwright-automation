import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/constants';

export class ForgotPasswordPage extends BasePage {
  private readonly emailInput: Locator;
  private readonly submitButton: Locator;
  private readonly messageText: Locator;
  private readonly errorText: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = this.page.locator('input[type="email"]');
    this.submitButton = this.page.locator('button[type="submit"]');
    this.messageText = this.page.locator('.message');
    this.errorText = this.page.locator('.error');
  }

  async goto(): Promise<void> {
    await super.goto(routes.forgotPassword);
  }

  async requestReset(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  getEmailInput(): Locator {
    return this.emailInput;
  }

  getSubmitButton(): Locator {
    return this.submitButton;
  }

  async getMessageText(): Promise<string> {
    return await this.messageText.innerText();
  }

  async getErrorText(): Promise<string> {
    return await this.errorText.innerText();
  }

  async isEmailValid(): Promise<boolean> {
    return await this.emailInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
  }

  async getEmailValidationMessage(): Promise<string> {
    return await this.emailInput.evaluate((el) => (el as HTMLInputElement).validationMessage);
  }

  async expectMessageContains(pattern: string | RegExp): Promise<void> {
    await expect(this.messageText).toBeVisible();
    await expect(this.messageText).toContainText(pattern);
  }

  async expectNoErrorText(): Promise<void> {
    const text = (await this.getErrorText().catch(() => '')).trim();
    expect(text).toBe('');
  }
}
