import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/constants';

export class ResetPasswordPage extends BasePage {
  private readonly passwordInput: Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly submitButton: Locator;
  private readonly successMessage: Locator;
  private readonly errorMessage: Locator;
  private readonly loginInputs: Locator;

  constructor(page: Page) {
    super(page);
    this.passwordInput = this.page.locator('input[name="password"]');
    this.confirmPasswordInput = this.page.locator('input[name="confirmPassword"]');
    this.submitButton = this.page.locator('button[type="submit"]');
    this.successMessage = this.page.locator('.success, .alert-success, .message');
    this.errorMessage = this.page.locator('.error, .alert-error');
    this.loginInputs = this.page.locator('input[name="username"], input[name="email"], [data-testid="login-username"]');
  }

  async gotoByToken(token: string): Promise<void> {
    await super.goto(routes.resetPassword(token));
  }

  async gotoByLink(link: string): Promise<void> {
    await this.page.goto(link, { waitUntil: 'domcontentloaded' });
  }

  async gotoByLinkWithResponse(link: string) {
    return await this.page.goto(link, { waitUntil: 'domcontentloaded' });
  }

  async fillPassword(value: string): Promise<void> {
    await this.passwordInput.fill(value);
  }

  async fillConfirmPassword(value: string): Promise<void> {
    await this.confirmPasswordInput.fill(value);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async resetPassword(password: string, confirmPassword: string): Promise<void> {
    await this.fillPassword(password);
    await this.fillConfirmPassword(confirmPassword);
    await this.submit();
  }

  async expectSuccessContains(pattern: RegExp | string): Promise<void> {
    await expect(this.successMessage).toBeVisible();
    await expect(this.successMessage).toContainText(pattern);
  }

  async expectErrorContains(pattern: RegExp | string): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(pattern);
  }

  async expectAnyErrorVisible(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
  }

  async waitForLoginOrReset(timeoutMs = 5000): Promise<void> {
    await this.page.waitForURL(/\/(login|reset-password)/, { timeout: timeoutMs });
  }

  async hasLoginInputVisible(): Promise<boolean> {
    return (await this.loginInputs.count()) > 0;
  }

  async expectPasswordInputsVisible(): Promise<void> {
    await expect(this.passwordInput).toBeVisible();
    await expect(this.confirmPasswordInput).toBeVisible();
  }
}
