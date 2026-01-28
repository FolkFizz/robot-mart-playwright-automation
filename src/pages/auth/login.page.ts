import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class LoginPage extends BasePage {
  // Selectors from login.ejs
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByTestId('login-username');
    this.passwordInput = page.getByTestId('login-password');
    this.loginButton = page.getByTestId('login-submit');
    this.errorMessage = page.locator('.error');
    this.successMessage = page.locator('.success');
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot Password?' });
    this.registerLink = page.getByRole('link', { name: 'Create an account' });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  async getErrorText(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  async clickForgotPassword() {
    await this.forgotPasswordLink.click();
  }

  async clickRegisterLink() {
    await this.registerLink.click();
  }
}
