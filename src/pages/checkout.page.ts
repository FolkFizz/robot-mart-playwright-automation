import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { routes } from '@config/constants';

// Page object model for Checkout page.
export class CheckoutPage extends BasePage {
  private readonly totalLabel: Locator;
  private readonly nameInput: Locator;
  private readonly emailInput: Locator;
  private readonly submitButton: Locator;
  private readonly paymentElement: Locator;
  private readonly paymentMessage: Locator;
  private readonly mockNote: Locator;
  private readonly orderSuccessMessage: Locator;
  private readonly orderIdLabel: Locator;
  private readonly successMessage: Locator;
  private readonly errorMessage: Locator;
  private readonly stripeIframes: Locator;
  private readonly addressInput: Locator;
  private readonly orderSummary: Locator;
  private readonly skipLink: Locator;
  private readonly mainContent: Locator;

  constructor(page: Page) {
    super(page);
    this.totalLabel = this.getByTestId('checkout-total');
    this.nameInput = this.getByTestId('checkout-name');
    this.emailInput = this.getByTestId('checkout-email');
    this.submitButton = this.getByTestId('checkout-submit');
    this.paymentElement = this.getByTestId('payment-element');
    this.paymentMessage = this.getByTestId('payment-message');
    this.mockNote = this.getByTestId('mock-payment-note');
    this.orderSuccessMessage = this.getByTestId('order-success-message');
    this.orderIdLabel = this.getByTestId('order-id');
    this.successMessage = this.page.locator('.success, .alert-success, .message');
    this.errorMessage = this.page.locator('.error, .alert-error');
    this.stripeIframes = this.page.locator('iframe[name^="__privateStripeFrame"]');
    this.addressInput = this.page
      .locator('input[name*="address" i], input[id*="address" i]')
      .first();
    this.orderSummary = this.page
      .locator('.order-summary, #order-summary, [aria-label*="summary" i]')
      .first();
    this.skipLink = this.page.locator('a[href="#main-content"], .skip-link').first();
    this.mainContent = this.page.locator('#main-content, [role="main"]').first();
  }

  static parsePrice(text: string): number {
    return Number.parseFloat(text.replace(/[^0-9.]/g, ''));
  }

  static parseShipping(text: string): number {
    return text.trim().toUpperCase() === 'FREE' ? 0 : CheckoutPage.parsePrice(text);
  }

  async goto(): Promise<void> {
    await super.goto(routes.checkout);
  }

  // Read total amount text.
  async getTotal(): Promise<string> {
    return await this.totalLabel.innerText();
  }

  // Fill customer name/email (required before payment).
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

  // Check whether the page is in mock payment mode.
  async isMockPayment(): Promise<boolean> {
    return await this.mockNote.isVisible().catch(() => false);
  }

  // Wait until Stripe UI is ready (data-stripe-ready="true").
  async waitForStripeReady(): Promise<void> {
    if (await this.isMockPayment()) return;
    await this.paymentElement.waitFor({ state: 'visible', timeout: 15000 });
    try {
      await expect(this.paymentElement).toHaveAttribute('data-stripe-ready', 'true', {
        timeout: 15000
      });
    } catch {
      // Fallback: if readiness attribute lags, wait for a Stripe iframe input instead.
      const frame = this.page.frameLocator(
        'iframe[name^="__privateStripeFrame"]:not([aria-hidden="true"])'
      );
      await frame
        .locator('input[name="cardnumber"], input[name="number"]')
        .first()
        .waitFor({ state: 'visible', timeout: 15000 });
    }
  }

  async fillStripeCard(card: {
    number: string;
    exp: string;
    cvc: string;
    postal?: string;
  }): Promise<void> {
    const frame = this.page.frameLocator(
      'iframe[name^="__privateStripeFrame"]:not([aria-hidden="true"])'
    );

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
    const frame = this.page.frameLocator(
      'iframe[name^="__privateStripeFrame"]:not([aria-hidden="true"])'
    );
    const numberInput = frame.locator('input[name="cardnumber"], input[name="number"]').first();
    await numberInput.fill(number);
  }

  // Submit payment (same button for mock and Stripe flows).
  async submitPayment(): Promise<void> {
    await this.submitButton.click();
    // Wait until loading finishes via body[data-loading].
    await this.page.waitForFunction(() => document.body.getAttribute('data-loading') === 'false');
  }

  async clickSubmit(): Promise<void> {
    await this.submitButton.click();
  }

  async getSubmitStatus(): Promise<string | null> {
    return await this.submitButton.getAttribute('data-status');
  }

  async isStripeSdkLoaded(): Promise<boolean> {
    return await this.page.evaluate(
      () => typeof (window as { Stripe?: unknown }).Stripe !== 'undefined'
    );
  }

  async waitForPaymentResult(
    timeoutMs = 30000
  ): Promise<{ status: 'success' | 'error' | 'timeout'; sawLoading: boolean; message?: string }> {
    let sawLoading = false;
    let latestMessage = '';

    try {
      await expect
        .poll(
          async () => {
            const status = await this.getSubmitStatus().catch(() => 'idle');
            if (status === 'loading') sawLoading = true;

            if (this.page.url().includes(`${routes.orderSuccessBase}?order_id=`)) {
              return 'success';
            }

            const messageText = (await this.paymentMessage.innerText().catch(() => '')).trim();
            if (messageText.length > 0) {
              latestMessage = messageText;
              return 'error';
            }

            return 'pending';
          },
          {
            timeout: timeoutMs,
            intervals: [200, 400, 600, 800, 1000]
          }
        )
        .not.toBe('pending');
    } catch {
      return { status: 'timeout', sawLoading };
    }

    if (this.page.url().includes(`${routes.orderSuccessBase}?order_id=`)) {
      return { status: 'success', sawLoading };
    }

    return { status: 'error', sawLoading, message: latestMessage };
  }

  async submitStripePayment(options: {
    name: string;
    email: string;
    card: { number: string; exp: string; cvc: string; postal?: string };
    timeoutMs?: number;
  }): Promise<{ status: 'success' | 'error' | 'timeout'; sawLoading: boolean; message?: string }> {
    await this.setName(options.name);
    await this.setEmail(options.email);

    await this.waitForStripeReady();
    await this.fillStripeCard(options.card);
    await expect(this.getSubmitButton()).toBeEnabled();
    await this.clickSubmit();

    return await this.waitForPaymentResult(options.timeoutMs ?? 30000);
  }

  // Read payment/error message text.
  async getPaymentMessage(): Promise<string> {
    return await this.paymentMessage.innerText();
  }

  async expectSuccessContains(pattern: string | RegExp): Promise<void> {
    await expect(this.successMessage).toBeVisible();
    await expect(this.successMessage).toContainText(pattern);
  }

  async expectOrderSuccessVisible(): Promise<void> {
    await expect(this.orderSuccessMessage).toBeVisible();
  }

  async getOrderIdText(): Promise<string> {
    return await this.orderIdLabel.innerText();
  }

  async expectAnyErrorVisible(): Promise<void> {
    await expect(this.errorMessage).toBeVisible();
  }

  async expectErrorContains(pattern: string | RegExp): Promise<void> {
    await this.expectAnyErrorVisible();
    await expect(this.errorMessage).toContainText(pattern);
  }

  async isNameInputVisible(): Promise<boolean> {
    return await this.nameInput.isVisible().catch(() => false);
  }

  async isSubmitButtonVisible(): Promise<boolean> {
    return await this.submitButton.isVisible().catch(() => false);
  }

  async expectSubmitVisible(): Promise<void> {
    await expect(this.submitButton).toBeVisible();
  }

  async expectMockPaymentNoteVisible(): Promise<void> {
    await expect(this.mockNote).toBeVisible();
  }

  async expectPaymentElementVisible(): Promise<void> {
    await expect(this.paymentElement).toBeVisible();
  }

  async getNameInputCount(): Promise<number> {
    return await this.nameInput.count();
  }

  async getSubmitButtonCount(): Promise<number> {
    return await this.submitButton.count();
  }

  async getPaymentElementCount(): Promise<number> {
    return await this.paymentElement.count();
  }

  async expectPaymentElementCount(count: number): Promise<void> {
    await expect(this.paymentElement).toHaveCount(count);
  }

  async getStripeFrameCount(): Promise<number> {
    return await this.stripeIframes.count();
  }

  async isStripeFrameVisible(): Promise<boolean> {
    if ((await this.getStripeFrameCount()) === 0) return false;
    return await this.stripeIframes
      .first()
      .isVisible()
      .catch(() => false);
  }

  async hasEmptyCartGuard(messages: string[]): Promise<boolean> {
    const body = (await this.getBodyText()).toLowerCase();
    return messages.some((message) => body.includes(message.toLowerCase()));
  }

  async hasAddressAutocomplete(): Promise<boolean | null> {
    if ((await this.addressInput.count()) === 0) return null;
    const autocomplete = await this.addressInput.getAttribute('autocomplete');
    return Boolean(autocomplete && autocomplete.length > 0);
  }

  async hasMockOrStripePaymentUi(): Promise<boolean> {
    if (await this.isMockPayment()) return true;
    if (await this.isStripeFrameVisible()) return true;
    return await this.paymentElement.isVisible().catch(() => false);
  }

  async waitForPaymentUiReady(timeoutMs = 15_000): Promise<void> {
    if (await this.isMockPayment()) {
      await expect(this.mockNote).toBeVisible({ timeout: timeoutMs });
      return;
    }

    if ((await this.getStripeFrameCount()) > 0) {
      await expect(this.stripeIframes.first()).toBeVisible({ timeout: timeoutMs });
      return;
    }

    await expect(this.paymentElement).toBeVisible({ timeout: timeoutMs });
  }

  async hasOrderSummary(): Promise<boolean> {
    return (await this.orderSummary.count()) > 0;
  }

  async getOrderSummaryText(): Promise<string> {
    if (!(await this.hasOrderSummary())) return '';
    return await this.orderSummary.innerText();
  }

  async hasSkipLink(): Promise<boolean> {
    return (await this.skipLink.count()) > 0;
  }

  async activateSkipLink(): Promise<void> {
    await this.skipLink.focus();
    await this.page.keyboard.press('Enter');
  }

  async tabOnce(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }

  async tabUntilNameInputFocused(maxTabs = 20): Promise<boolean> {
    for (let i = 0; i < maxTabs; i += 1) {
      await this.tabOnce();
      const isFocused = await this.nameInput.evaluate((el) => el === document.activeElement);
      if (isFocused) return true;
    }
    return false;
  }

  async isMainContentFocused(): Promise<boolean | null> {
    if ((await this.mainContent.count()) === 0) return null;
    return await this.mainContent.evaluate((el) => el === document.activeElement);
  }

  async isNameValid(): Promise<boolean> {
    return await this.nameInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
  }

  async isEmailValid(): Promise<boolean> {
    return await this.emailInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
  }

  async getNameValidationMessage(): Promise<string> {
    return await this.nameInput.evaluate((el) => (el as HTMLInputElement).validationMessage);
  }

  async getEmailValidationMessage(): Promise<string> {
    return await this.emailInput.evaluate((el) => (el as HTMLInputElement).validationMessage);
  }

  getA11yExcludeSelectors(): string[] {
    return ['.chat-toggle', '.email-badge', '.notif-badge'];
  }
}
