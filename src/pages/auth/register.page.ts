import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class RegisterPage extends BasePage {
  // Selectors from register.ejs
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly registerButton: Locator;
  readonly errorMessage: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByTestId('register-username');
    this.emailInput = page.getByTestId('register-email');
    this.passwordInput = page.getByTestId('register-password');
    this.confirmPasswordInput = page.getByTestId('register-confirm-password');
    this.registerButton = page.getByTestId('register-submit');
    this.errorMessage = page.locator('.error');
    this.loginLink = page.getByRole('link', { name: 'Login here' });
  }

  async goto() {
    await this.page.goto('/register');
  }

  async register(username: string, email: string, password: string, confirmPassword: string) {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.registerButton.click();
  }

  async isErrorVisible(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  async getErrorText(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }

  async clickLoginLink() {
    await this.loginLink.click();
  }
}
