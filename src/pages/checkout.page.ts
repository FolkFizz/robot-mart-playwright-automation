import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { testIdCheckout } from '@selectors/testids';

// POM สำหรับหน้า Checkout
export class CheckoutPage extends BasePage {
  private readonly nameInput: Locator;
  private readonly emailInput: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = this.getByTestId(testIdCheckout.name);
    this.emailInput = this.getByTestId(testIdCheckout.email);
    this.submitButton = this.getByTestId(testIdCheckout.submit);
  }

  // อ่านยอดรวม (total)
  async getTotal(): Promise<string> {
    return await this.getByTestId(testIdCheckout.total).innerText();
  }

  // กรอกชื่อ/อีเมล (จำเป็นก่อนจ่าย)
  async fillCustomerInfo(name: string, email: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
  }

  // เช็คว่าเป็น mock payment mode หรือไม่
  async isMockPayment(): Promise<boolean> {
    return await this.getByTestId(testIdCheckout.mockNote).isVisible().catch(() => false);
  }

  // รอ Stripe element พร้อม (ใช้ data-stripe-ready="true")
  async waitForStripeReady(): Promise<void> {
    const paymentElement = this.getByTestId(testIdCheckout.paymentElement);
    await paymentElement.waitFor({ state: 'visible', timeout: 15000 });
    await expect(paymentElement).toHaveAttribute('data-stripe-ready', 'true', { timeout: 15000 });
  }

  // กดจ่ายเงิน (ทั้ง mock และ stripe ใช้ปุ่มเดียวกัน)
  async submitPayment(): Promise<void> {
    await this.submitButton.click();
    // รอให้ loading จบ (อาศัย body[data-loading])
    await this.page.waitForFunction(
      () => document.body.getAttribute('data-loading') === 'false'
    );
  }

  // อ่านข้อความ error/payment message
  async getPaymentMessage(): Promise<string> {
    return await this.getByTestId(testIdCheckout.paymentMessage).innerText();
  }
}
