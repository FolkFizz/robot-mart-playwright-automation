import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/routes';

// POM สำหรับหน้า Login
export class LoginPage extends BasePage {
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  private readonly accountMenu: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = this.getByTestId('login-username');
    this.passwordInput = this.getByTestId('login-password');
    this.submitButton = this.getByTestId('login-submit');
    this.accountMenu = this.getByTestId('nav-account-menu');
  }

  // เปิดหน้า login
  async goto(): Promise<void> {
    await super.goto(routes.login);
  }

  // login ด้วย username/password
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    // รอจนเมนู account โผล่ (แปลว่า login สำเร็จ)
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
}
