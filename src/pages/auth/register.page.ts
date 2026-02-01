import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/routes';
import { testIdAuth, testIdNav } from '@selectors/testids';

// POM สำหรับหน้า Register
export class RegisterPage extends BasePage {
  private readonly usernameInput: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = this.getByTestId(testIdAuth.registerUsername);
    this.emailInput = this.getByTestId(testIdAuth.registerEmail);
    this.passwordInput = this.getByTestId(testIdAuth.registerPassword);
    this.confirmPasswordInput = this.getByTestId(testIdAuth.registerConfirm);
    this.submitButton = this.getByTestId(testIdAuth.registerSubmit);
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
}
