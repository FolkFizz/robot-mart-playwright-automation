import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/constants';

// POM สำหรับหน้า Register
export class RegisterPage extends BasePage {
  private readonly usernameInput: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = this.getByTestId('register-username');
    this.emailInput = this.getByTestId('register-email');
    this.passwordInput = this.getByTestId('register-password');
    this.confirmPasswordInput = this.getByTestId('register-confirm-password');
    this.submitButton = this.getByTestId('register-submit');
  }

  // เปิดหน้า register
  async goto(): Promise<void> {
    await super.goto(routes.register);
  }

  // สมัครสมาชิกใหม่
  async register(username: string, email: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.submitButton.click();
    // หลังสมัครสำเร็จจะ redirect ไป login หรือหน้าอื่น
    // เลยใช้ wait network idle กันไว้
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
}
