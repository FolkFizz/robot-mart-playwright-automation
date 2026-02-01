import { Page, Locator, expect } from '@playwright/test';
import { testIdCheckout } from '@selectors/testids';

// Component สำหรับส่วนชำระเงินในหน้า Checkout
export class StripePaymentComponent {
  private readonly page: Page;
  private readonly paymentElement: Locator;
  private readonly paymentMessage: Locator;
  private readonly submitButton: Locator;
  private readonly mockNote: Locator;

  constructor(page: Page) {
    this.page = page;
    this.paymentElement = page.getByTestId(testIdCheckout.paymentElement);
    this.paymentMessage = page.getByTestId(testIdCheckout.paymentMessage);
    this.submitButton = page.getByTestId(testIdCheckout.submit);
    this.mockNote = page.getByTestId(testIdCheckout.mockNote);
  }

  // เช็คว่าอยู่ในโหมด mock payment หรือไม่
  async isMockPayment(): Promise<boolean> {
    return await this.mockNote.isVisible().catch(() => false);
  }

  // รอให้ Stripe element พร้อมใช้งาน (data-stripe-ready="true")
  async waitForStripeReady(): Promise<void> {
    if (await this.isMockPayment()) return;
    await this.paymentElement.waitFor({ state: 'visible', timeout: 15000 });
    await expect(this.paymentElement).toHaveAttribute('data-stripe-ready', 'true', { timeout: 15000 });
  }

  // กดจ่ายเงิน
  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  // อ่านข้อความสถานะการชำระเงิน
  async getPaymentMessage(): Promise<string> {
    return await this.paymentMessage.innerText();
  }

  // อ่านสถานะปุ่ม submit (data-status)
  async getSubmitStatus(): Promise<string | null> {
    return await this.submitButton.getAttribute('data-status');
  }

  // เช็คว่าปุ่มจ่ายเงินกดได้หรือไม่
  async isSubmitEnabled(): Promise<boolean> {
    return await this.submitButton.isEnabled();
  }
}
