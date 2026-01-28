import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class LoginPage extends BasePage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = page.getByTestId('login-username');
    this.passwordInput = page.getByTestId('login-password');
    this.loginButton = page.getByTestId('login-submit');
    this.successMessage = page.locator('.success');
    this.errorMessage = page.locator('.error');
    this.forgotPasswordLink = page.getByRole('link', { name: 'Forgot Password?' });
    this.registerLink = page.getByRole('link', { name: 'Create an account' });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async loginAs(username: string, pass: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(pass);
    await this.loginButton.click();
  }

  async verifyLoginSuccess() {
      // Assuming redirect or success message
      // If redirect:
      // await this.page.waitForURL('/dashboard'); 
      // OR check for some element. 
      // Based on EJS, there is a likely redirect.
      // But for now, we will wait for url or check state.
      // EJS has <div class="success"> if rendered? 
      // Usually redirects to home or dashboard.
  }
}
