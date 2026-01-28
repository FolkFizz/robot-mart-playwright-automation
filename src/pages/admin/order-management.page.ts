import { Page, Locator } from '@playwright/test';
import { BaseAdminPage } from './base-admin.page';

/**
 * Admin Order Management Page
 * Allows viewing and updating order statuses.
 */
export class OrderManagementPage extends BaseAdminPage {
  readonly ordersTable: Locator;

  constructor(page: Page) {
    super(page);
    this.ordersTable = page.getByTestId('admin-orders-table');
  }

  /**
   * Returns a locator for a specific order row in the table.
   * @param orderId The unique identifier for the order.
   * @returns Locator for the table row (tr).
   */
  private getOrderRow(orderId: string): Locator {
    return this.ordersTable.locator(`tr[data-order-id="${orderId}"]`);
  }

  /**
   * Retrieves the current status text of a specific order.
   * @param orderId The ID of the order to check.
   * @returns The current status as a string.
   */
  async getOrderStatus(orderId: string): Promise<string> {
    const row = this.getOrderRow(orderId);
    const statusLocator = row.getByTestId('order-status');
    return await statusLocator.innerText();
  }

  /**
   * Updates the status of a specific order.
   * @param orderId The ID of the order to update.
   * @param newStatus The new status to set (e.g., 'Shipped', 'Processing').
   */
  async updateOrderStatus(orderId: string, newStatus: string): Promise<void> {
    const row = this.getOrderRow(orderId);
    const statusSelect = row.getByTestId('status-select');
    const updateButton = row.getByTestId('update-status-button');

    await statusSelect.selectOption({ label: newStatus });
    await updateButton.click();
  }

  /**
   * Navigates directly to the admin order management page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/admin/orders');
  }
}