import { Page, Locator } from '@playwright/test';
import { BaseAdminPage } from './base-admin.page';

export class StockResetPage extends BaseAdminPage {
  readonly resetButton: Locator;
  readonly confirmButton: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    super(page);
    
    this.resetButton = page.locator('button:has-text("Reset Stock")');
    this.confirmButton = page.locator('button:has-text("Confirm")');
    this.successMessage = page.locator('.success, .alert-success');
  }

  async goto() {
    await this.page.goto('/admin/stock-reset');
  }

  async resetStock() {
    await this.resetButton.click();
    await this.confirmButton.click();
    await this.successMessage.waitFor();
  }
}
