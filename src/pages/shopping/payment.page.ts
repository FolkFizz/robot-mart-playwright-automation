import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class PaymentPage extends BasePage {
  // This is actually part of CheckoutPage in the robot-store-sandbox
  // Payment happens on the checkout page, not a separate page
  // Keeping this for compatibility but redirecting to checkout
  
  readonly checkoutPage: Locator;

  constructor(page: Page) {
    super(page);
    this.checkoutPage = page.locator('body');
  }

  async goto() {
    // Redirect to checkout as payment is part of checkout flow
    await this.page.goto('/order/checkout');
  }
}
