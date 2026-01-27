import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CheckoutPage extends BasePage {
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly submitBtn: Locator;
  readonly stripeFrame: Locator;

  constructor(page: Page) {
    super(page);
    this.nameInput = page.getByTestId('checkout-name');
    this.emailInput = page.getByTestId('checkout-email');
    this.submitBtn = page.getByTestId('checkout-submit');
    this.stripeFrame = page.frameLocator('iframe[src*="stripe"]').first();
  }

  /**
   * Fills checkout form and handles Stripe safely
   */
  async fillPaymentDetails(name: string, email: string) {
    // Fill basic info
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);

    // Wait for Stripe to be visible
    const cardInput = this.stripeFrame.locator('input[placeholder="1234 1234 1234 1234"]');
    await expect(cardInput).toBeVisible({ timeout: 20000 });

    // Fill Stripe fields
    await cardInput.click();
    await cardInput.fill('4242424242424242');
    await this.stripeFrame.locator('input[placeholder="MM / YY"]').fill('12 / 30');
    await this.stripeFrame.locator('input[placeholder="CVC"]').fill('123');

    // Trigger blur to ensure validation
    await this.page.locator('body').click({ position: { x: 0, y: 0 } });
  }

  /**
   * Submits the order with retry logic for robustness
   */
  async submitOrder() {
    // 1. Wait for button to be enabled (Stripe ready)
    await expect(this.submitBtn).not.toBeDisabled({ timeout: 15000 }).catch(async () => {
      console.log('Stripe validation slow, re-triggering blur...');
      await this.page.locator('body').click();
      await expect(this.submitBtn).not.toBeDisabled();
    });

    // 2. Click to submit
    await this.submitBtn.click();

    // 3. Handle potential click-swallowing (Firefox)
    try {
      await this.page.waitForURL(/\/order\/success/, { timeout: 5000 });
    } catch {
      console.log('Submit click ignored, using dispatchEvent fallback...');
      await this.submitBtn.dispatchEvent('click');
      await this.page.waitForURL(/\/order\/success/, { timeout: 10000 });
    }

    // 4. Verify success
    await expect(this.page.getByTestId('order-success-message')).toBeVisible();
  }
}
