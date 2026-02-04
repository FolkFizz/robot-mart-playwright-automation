import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

// POM สำหรับหน้า Checkout
export class CheckoutPage extends BasePage {
  private readonly totalLabel: Locator;
  private readonly nameInput: Locator;
  private readonly emailInput: Locator;
  private readonly submitButton: Locator;
  private readonly paymentElement: Locator;
  private readonly paymentMessage: Locator;
  private readonly mockNote: Locator;

  constructor(page: Page) {
    super(page);
    this.totalLabel = this.getByTestId('checkout-total');
    this.nameInput = this.getByTestId('checkout-name');
    this.emailInput = this.getByTestId('checkout-email');
    this.submitButton = this.getByTestId('checkout-submit');
    this.paymentElement = this.getByTestId('payment-element');
    this.paymentMessage = this.getByTestId('payment-message');
    this.mockNote = this.getByTestId('mock-payment-note');
  }

  // อ่านยอดรวม (total)
  async getTotal(): Promise<string> {
    return await this.totalLabel.innerText();
  }

  // กรอกชื่อ/อีเมล (จำเป็นก่อนจ่าย)
  async fillCustomerInfo(name: string, email: string): Promise<void> {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
  }

  async setName(value: string): Promise<void> {
    await this.nameInput.fill(value);
  }

  async setEmail(value: string): Promise<void> {
    await this.emailInput.fill(value);
  }

  async getNameValue(): Promise<string> {
    return await this.nameInput.inputValue();
  }

  async getEmailValue(): Promise<string> {
    return await this.emailInput.inputValue();
  }

  getNameInput(): Locator {
    return this.nameInput;
  }

  getEmailInput(): Locator {
    return this.emailInput;
  }

  getSubmitButton(): Locator {
    return this.submitButton;
  }

  getPaymentMessageLocator(): Locator {
    return this.paymentMessage;
  }

  // เช็คว่าเป็น mock payment mode หรือไม่
  async isMockPayment(): Promise<boolean> {
    return await this.mockNote.isVisible().catch(() => false);
  }

  // รอ Stripe element พร้อม (ใช้ data-stripe-ready="true")
  async waitForStripeReady(): Promise<void> {
    await this.paymentElement.waitFor({ state: 'visible', timeout: 15000 });
    try {
      await expect(this.paymentElement).toHaveAttribute('data-stripe-ready', 'true', { timeout: 15000 });
    } catch {
      // Fallback: บางครั้ง data-stripe-ready อัปเดตช้า ให้เช็คว่า input ใน iframe โผล่แทน
      const frame = this.page.frameLocator('iframe[name^="__privateStripeFrame"]:not([aria-hidden="true"])');
      await frame
        .locator('input[name="cardnumber"], input[name="number"]')
        .first()
        .waitFor({ state: 'visible', timeout: 15000 });
    }
  }

  // กดจ่ายเงิน (ทั้ง mock และ stripe ใช้ปุ่มเดียวกัน)
  async submitPayment(): Promise<void> {
    await this.submitButton.click();
    // รอให้ loading จบ (อาศัย body[data-loading])
    await this.page.waitForFunction(
      () => document.body.getAttribute('data-loading') === 'false'
    );
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  async getSubmitStatus(): Promise<string | null> {
    return await this.submitButton.getAttribute('data-status');
  }

  // อ่านข้อความ error/payment message
  async getPaymentMessage(): Promise<string> {
    return await this.paymentMessage.innerText();
  }
}
