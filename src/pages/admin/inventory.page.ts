import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/constants';

// Page object model for Admin Inventory page.
export class AdminInventoryPage extends BasePage {
  private readonly categorySelect: Locator;
  private readonly searchInput: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.categorySelect = this.page.locator('select[name="category"]');
    this.searchInput = this.page.locator('input[name="search"]');
    this.submitButton = this.page.locator('form.search-form button[type="submit"]');
  }

  // Open admin inventory page.
  async goto(): Promise<void> {
    await super.goto(routes.admin.inventory);
  }

  // Filter inventory by category and search keyword.
  async filter(category?: string, search?: string): Promise<void> {
    if (category) {
      await this.categorySelect.selectOption(category);
    }
    if (search !== undefined) {
      await this.searchInput.fill(search);
    }
    await this.submitButton.click();
    await this.waitForNetworkIdle();
  }

  // Find product row by product name.
  getRowByProductName(name: string): Locator {
    return this.page.locator('table.data-table tbody tr', { hasText: name });
  }

  // Read stock badge text for a product.
  async getStockByProductName(name: string): Promise<string> {
    const row = this.getRowByProductName(name);
    return await row.locator('.stock-badge').innerText();
  }

  // Open edit action for a product by name.
  async openEditByProductName(name: string): Promise<void> {
    const row = this.getRowByProductName(name);
    await row.locator('.btn-edit').click();
    await this.waitForNetworkIdle();
  }
}
