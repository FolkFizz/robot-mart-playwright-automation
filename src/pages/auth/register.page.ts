import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/constants';

// Page object model for Register page.
export class RegisterPage extends BasePage {
  private readonly usernameInput: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly submitButton: Locator;
  private readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = this.getByTestId('register-username');
    this.emailInput = this.getByTestId('register-email');
    this.passwordInput = this.getByTestId('register-password');
    this.confirmPasswordInput = this.getByTestId('register-confirm-password');
    this.submitButton = this.getByTestId('register-submit');
    this.errorMessage = this.page.locator('.error, .alert-error');
  }

  // Open register page.
  async goto(): Promise<void> {
    await super.goto(routes.register);
  }

  // Register a new user.
  async register(username: string, email: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.submitButton.click();
    // Registration may redirect to login or another page.
    // Wait for network idle to stabilize post-submit state.
    await this.waitForNetworkIdle();
  }

  async fillUsername(value: string): Promise<void> {
    await this.usernameInput.fill(value);
  }

  async fillEmail(value: string): Promise<void> {
    await this.emailInput.fill(value);
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

  async expectErrorVisible(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
  }

  async expectErrorContains(pattern: string | RegExp): Promise<void> {
    await this.expectErrorVisible();
    await expect(this.errorMessage).toContainText(pattern);
  }
}
