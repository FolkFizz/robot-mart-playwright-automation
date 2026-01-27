import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async verifyOrder(orderId: string) {
    await this.page.goto('/admin/dashboard');
    const orderRow = this.page.getByTestId(`order-row-${orderId}`);
    await expect(orderRow).toBeVisible({ timeout: 10000 });
    await expect(orderRow).toContainText(/paid/i);
  }
}
