import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/constants';

// Page object model for Admin Orders page.
export class AdminOrdersPage extends BasePage {
  private readonly table: Locator;

  constructor(page: Page) {
    super(page);
    this.table = this.page.locator('table');
  }

  // Open admin orders page.
  async goto(): Promise<void> {
    await super.goto(routes.admin.orders);
  }

  // Find order row by orderId.
  getOrderRow(orderId: string): Locator {
    return this.table.locator('tbody tr', { hasText: orderId });
  }

  // Expand order items section (summary element).
  async toggleItems(orderId: string): Promise<void> {
    const row = this.getOrderRow(orderId);
    await row.locator('summary').click();
  }

  // Count orders in table (excluding empty rows).
  async getOrderCount(): Promise<number> {
    return await this.table.locator('tbody tr:not([data-empty])').count();
  }
}
