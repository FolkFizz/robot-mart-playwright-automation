import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class CheckoutPage extends BasePage {
  // Order Summary Selectors
  readonly orderSummary: Locator;
  readonly checkoutTotal: Locator;
  readonly subtotal: Locator;
  readonly discount: Locator;
  readonly shipping: Locator;

  // Form Selectors
  readonly checkoutForm: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly paymentElement: Locator;
  readonly mockPaymentNote: Locator;
  readonly submitButton: Locator;
  readonly paymentMessage: Locator;

  constructor(page: Page) {
    super(page);
    
    // Order Summary
    this.orderSummary = page.locator('.summary');
    this.checkoutTotal = page.locator('[data-testid="checkout-total"]');
    this.subtotal = page.locator('.summary-row').filter({ hasText: 'Items' });
    this.discount = page.locator('.summary-row').filter({ hasText: 'Discount' });
    this.shipping = page.locator('.summary-row').filter({ hasText: 'Shipping' });

    // Form
    this.checkoutForm = page.locator('[data-testid="checkout-form"]');
    this.nameInput = page.locator('[data-testid="checkout-name"]');
    this.emailInput = page.locator('[data-testid="checkout-email"]');
    this.paymentElement = page.locator('[data-testid="payment-element"]');
    this.mockPaymentNote = page.locator('[data-testid="mock-payment-note"]');
    this.submitButton = page.locator('[data-testid="checkout-submit"]');
    this.paymentMessage = page.locator('[data-testid="payment-message"]');
  }

  async goto() {
    await this.page.goto('/order/checkout');
  }

  async getTotalAmount(): Promise<string> {
    return await this.checkoutTotal.textContent() || '';
  }

  async fillCustomerInfo(name: string, email: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
  }

  async isMockPaymentEnabled(): Promise<boolean> {
    return await this.mockPaymentNote.isVisible();
  }

  async isStripePaymentEnabled(): Promise<boolean> {
    const isVisible = await this.paymentElement.isVisible();
    if (!isVisible) return false;
    
    // Check if Stripe element is ready
    const stripeReady = await this.paymentElement.getAttribute('data-stripe-ready');
    return stripeReady === 'true';
  }

  async waitForStripeReady(timeout: number = 10000) {
    await this.page.waitForFunction(() => {
      const element = document.querySelector('[data-testid="payment-element"]');
      return element?.getAttribute('data-stripe-ready') === 'true';
    }, { timeout });
  }

  async submitOrder() {
    await this.submitButton.click();
  }

  async completeMockCheckout(name: string, email: string) {
    await this.fillCustomerInfo(name, email);
    await this.submitOrder();
    
    // Wait for redirect to success page
    await this.page.waitForURL(/\/order\/success/, { timeout: 10000 });
  }

  async getPaymentMessage(): Promise<string> {
    return await this.paymentMessage.textContent() || '';
  }

  async isSubmitButtonDisabled(): Promise<boolean> {
    return await this.submitButton.isDisabled();
  }

  async getSubmitButtonStatus(): Promise<string> {
    return await this.submitButton.getAttribute('data-status') || '';
  }

  async hasDiscount(): Promise<boolean> {
    return await this.discount.isVisible();
  }

  async isFreeShipping(): Promise<boolean> {
    const shippingText = await this.shipping.textContent() || '';
    return shippingText.includes('FREE');
  }
}
