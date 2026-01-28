import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class OrderSuccessPage extends BasePage {
  readonly successMessage: Locator;
  readonly orderId: Locator;
  readonly viewInvoiceButton: Locator;
  readonly buyMoreButton: Locator;

  constructor(page: Page) {
    super(page);
    
    this.successMessage = page.locator('[data-testid="order-success-message"]');
    this.orderId = page.locator('[data-testid="order-id"]');
    this.viewInvoiceButton = page.locator('a[href*="/order/invoice/"]');
    this.buyMoreButton = page.locator('a[href="/"]').filter({ hasText: /Buy More/i });
  }

  async goto(orderId: string) {
    await this.page.goto(`/order/success?order_id=${orderId}`);
  }

  async getOrderId(): Promise<string> {
    return await this.orderId.textContent() || '';
  }

  async isSuccessMessageVisible(): Promise<boolean> {
    return await this.successMessage.isVisible();
  }

  async viewInvoice() {
    await this.viewInvoiceButton.click();
  }

  async continueShopping() {
    await this.buyMoreButton.click();
  }
}
