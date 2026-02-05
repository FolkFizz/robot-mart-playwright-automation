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

  static parsePrice(text: string): number {
    return Number.parseFloat(text.replace(/[^0-9.]/g, ''));
  }

  static parseShipping(text: string): number {
    return text.trim().toUpperCase() === 'FREE' ? 0 : CheckoutPage.parsePrice(text);
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

  async fillStripeCard(card: { number: string; exp: string; cvc: string; postal?: string }): Promise<void> {
    const frame = this.page.frameLocator('iframe[name^="__privateStripeFrame"]:not([aria-hidden="true"])');

    const numberInput = frame.locator('input[name="cardnumber"], input[name="number"]').first();
    await numberInput.fill(card.number);

    const expInput = frame.locator('input[name="exp-date"], input[name="expiry"]').first();
    await expInput.fill(card.exp);

    const cvcInput = frame.locator('input[name="cvc"]').first();
    await cvcInput.fill(card.cvc);

    const postal = frame.locator('input[name="postal"], input[name="postalCode"]');
    if (await postal.count()) {
      await postal.first().fill(card.postal ?? '10001');
    }
  }

  async fillCardNumber(number: string): Promise<void> {
    const frame = this.page.frameLocator('iframe[name^="__privateStripeFrame"]:not([aria-hidden="true"])');
    const numberInput = frame.locator('input[name="cardnumber"], input[name="number"]').first();
    await numberInput.fill(number);
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

  async waitForPaymentResult(timeoutMs = 30000): Promise<{ status: 'success' | 'error' | 'timeout'; sawLoading: boolean; message?: string }> {
    const deadline = Date.now() + timeoutMs;
    let sawLoading = false;

    while (Date.now() < deadline) {
      if (/\/order\/success\?order_id=/.test(this.page.url())) {
        return { status: 'success', sawLoading };
      }

      const hasMessage = (await this.paymentMessage.count().catch(() => 0)) > 0;
      if (hasMessage) {
        const text = (await this.paymentMessage.innerText().catch(() => '')).trim();
        if (text.length > 0) {
          return { status: 'error', sawLoading, message: text };
        }
      }

      const status = await this.getSubmitStatus().catch(() => 'idle');
      if (status === 'loading') sawLoading = true;

      await this.page.waitForTimeout(500);
    }

    return { status: 'timeout', sawLoading };
  }

  async submitStripePayment(options: { name: string; email: string; card: { number: string; exp: string; cvc: string; postal?: string }; timeoutMs?: number }): Promise<{ status: 'success' | 'error' | 'timeout'; sawLoading: boolean; message?: string }> {
    await this.setName(options.name);
    await this.setEmail(options.email);

    await this.waitForStripeReady();
    await this.fillStripeCard(options.card);
    await expect(this.getSubmitButton()).toBeEnabled();
    await this.clickSubmit();

    return await this.waitForPaymentResult(options.timeoutMs ?? 30000);
  }

  // อ่านข้อความ error/payment message
  async getPaymentMessage(): Promise<string> {
    return await this.paymentMessage.innerText();
  }
}
