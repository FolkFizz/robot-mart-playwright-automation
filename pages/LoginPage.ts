import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly userInput: Locator;
  readonly passInput: Locator;
  readonly loginBtn: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    super(page);
    this.userInput = page.getByTestId('login-username');
    this.passInput = page.getByTestId('login-password');
    this.loginBtn = page.getByTestId('login-submit');
  }

  async navigate() {
    await this.page.goto('/login');
  }

  async login(username: string, pass: string) {
    await this.userInput.fill(username);
    await this.passInput.fill(pass);
    await this.loginBtn.click();
  }

  async verifyLoggedIn() {
    await expect(this.page.getByTestId('nav-account-menu')).toBeVisible();
  }
}
