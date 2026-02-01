import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/routes';
import { testIdAuth, testIdNav } from '@selectors/testids';

// POM สำหรับหน้า Login
export class LoginPage extends BasePage {
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.usernameInput = this.getByTestId(testIdAuth.loginUsername);
    this.passwordInput = this.getByTestId(testIdAuth.loginPassword);
    this.submitButton = this.getByTestId(testIdAuth.loginSubmit);
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
    await this.getByTestId(testIdNav.accountMenu).waitFor({ state: 'visible', timeout: 15000 });
  }
}
