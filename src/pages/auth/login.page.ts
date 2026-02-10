import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/constants';

// Page object model for Login page.
export class LoginPage extends BasePage {
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  private readonly accountMenu: Locator;
  private readonly errorMessage: Locator;
  private readonly loginInputs: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = this.getByTestId('login-username');
    this.passwordInput = this.getByTestId('login-password');
    this.submitButton = this.getByTestId('login-submit');
    this.accountMenu = this.getByTestId('nav-account-menu');
    this.errorMessage = this.page.locator('.error, .alert-error');
    this.loginInputs = this.page.locator(
      'input[name="username"], input[name="email"], [data-testid="login-username"]'
    );
  }

  // Open login page.
  async goto(): Promise<void> {
    await super.goto(routes.login);
  }

  // Log in with username/password credentials.
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    // Account menu visibility indicates successful login.
    await this.accountMenu.waitFor({ state: 'visible', timeout: 15000 });
  }

  async fillUsername(value: string): Promise<void> {
    await this.usernameInput.fill(value);
  }

  async fillPassword(value: string): Promise<void> {
    await this.passwordInput.fill(value);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  getUsernameInput(): Locator {
    return this.usernameInput;
  }

  getErrorMessageLocator(): Locator {
    return this.errorMessage;
  }

  async expectErrorVisible(): Promise<void> {
    await this.errorMessage.waitFor({ state: 'visible' });
  }

  async expectErrorContains(pattern: string | RegExp): Promise<void> {
    await this.expectErrorVisible();
    await expect(this.errorMessage.first()).toContainText(pattern);
  }

  async hasAnyLoginInputVisible(): Promise<boolean> {
    return (await this.loginInputs.count()) > 0;
  }

  async isLoginLinkVisible(name: string): Promise<boolean> {
    return await this.page
      .getByRole('link', { name })
      .isVisible()
      .catch(() => false);
  }
}
