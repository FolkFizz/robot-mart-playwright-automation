import { Page, Locator } from '@playwright/test';
import { BaseAdminPage } from './base-admin.page';

/**
 * Admin Inventory Management Page
 * Allows searching for products and updating their stock levels.
 */
export class InventoryManagementPage extends BaseAdminPage {
  readonly searchInput: Locator;
  readonly inventoryTable: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.getByTestId('product-search-input');
    this.inventoryTable = page.getByTestId('admin-inventory-table');
  }

  /**
   * Searches for a product in the inventory list.
   * @param productName The name of the product to search for.
   */
  async searchForProduct(productName: string): Promise<void> {
    await this.searchInput.fill(productName);
    await this.searchInput.press('Enter');
  }

  /**
   * Returns a locator for a specific product row.
   * Assumes a search has been performed if the product isn't visible.
   * @param productName The unique name of the product.
   * @returns Locator for the table row (tr).
   */
  private getProductRow(productName: string): Locator {
    // Using a data attribute on the row is more robust than :has-text
    return this.inventoryTable.locator(`tr[data-product-name="${productName}"]`);
  }

  /**
   * Gets the current stock quantity for a given product.
   * @param productName The name of the product to check.
   * @returns The current stock as a number.
   */
  async getCurrentStock(productName: string): Promise<number> {
    const row = this.getProductRow(productName);
    const stockInput = row.getByTestId('stock-quantity-input');
    const value = await stockInput.inputValue();
    return parseInt(value, 10);
  }

  /**
   * Updates the stock for a given product.
   * This method assumes the product is already visible on the page (e.g., via search).
   * @param productName The name of the product to update.
   * @param quantity The new stock quantity.
   */
  async updateStock(productName: string, quantity: number): Promise<void> {
    const row = this.getProductRow(productName);
    const stockInput = row.getByTestId('stock-quantity-input');
    const saveButton = row.getByTestId('save-stock-button');

    await stockInput.fill(quantity.toString());
    await saveButton.click();
  }

  /**
   * Navigates directly to the admin inventory management page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/admin/inventory');
  }
}