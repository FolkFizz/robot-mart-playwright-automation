import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/constants';

// Page object model for Admin Dashboard page.
export class AdminDashboardPage extends BasePage {
  private readonly searchInput: Locator;
  private readonly ordersTable: Locator;

  constructor(page: Page) {
    super(page);
    // Order search field on dashboard.
    this.searchInput = this.page.locator('#orderSearchInput');
    // Recent orders table.
    this.ordersTable = this.page.locator('#recentOrdersTable');
  }

  // Open admin dashboard page.
  async goto(): Promise<void> {
    await super.goto(routes.admin.dashboard);
  }

  // Search orders in the table.
  async searchOrder(query: string): Promise<void> {
    await this.searchInput.fill(query);
    // Table filtering is realtime and does not require submit.
  }

  // Return locator for order row by orderId.
  getOrderRow(orderId: string): Locator {
    return this.getByTestId(`order-row-${orderId}`);
  }

  // Check whether the order row is highlighted.
  async isOrderHighlighted(orderId: string): Promise<boolean> {
    const row = this.getOrderRow(orderId);
    return await row.evaluate((el) => el.classList.contains('row-highlight'));
  }

  // Count visible order rows (excluding empty rows).
  async getVisibleOrderCount(): Promise<number> {
    return await this.ordersTable.locator('tbody tr:not([data-empty])').count();
  }

  // Open invoice link from an order row.
  async openInvoice(orderId: string): Promise<void> {
    const row = this.getOrderRow(orderId);
    await row.locator('a.action-link').click();
    await this.waitForNetworkIdle();
  }
}
