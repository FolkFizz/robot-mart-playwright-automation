import { Page, Locator } from '@playwright/test';
import { BaseAdminPage } from './base-admin.page';

export class ClaimManagementPage extends BaseAdminPage {
  readonly claimsTable: Locator;
  readonly filterSelect: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    
    this.claimsTable = page.locator('table, .claims-list');
    this.filterSelect = page.locator('select[name="status"]');
    this.searchInput = page.locator('input[name="search"]');
  }

  async goto() {
    await this.page.goto('/admin/claims');
  }

  async filterByStatus(status: string) {
    await this.filterSelect.selectOption(status);
  }

  async searchClaim(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }
}
