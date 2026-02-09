import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/constants';

// POM สำหรับหน้า Admin Dashboard
export class AdminDashboardPage extends BasePage {
  private readonly searchInput: Locator;
  private readonly ordersTable: Locator;

  constructor(page: Page) {
    super(page);
    // ช่องค้นหา order ใน dashboard
    this.searchInput = this.page.locator('#orderSearchInput');
    // ตาราง recent orders
    this.ordersTable = this.page.locator('#recentOrdersTable');
  }

  // เปิดหน้า dashboard
  async goto(): Promise<void> {
    await super.goto(routes.admin.dashboard);
  }

  // ค้นหา order ในตาราง
  async searchOrder(query: string): Promise<void> {
    await this.searchInput.fill(query);
    // ตาราง filter ทำงานแบบ realtime (ไม่ต้องกด submit)
  }

  // คืน locator ของแถว order ตาม orderId
  getOrderRow(orderId: string): Locator {
    return this.getByTestId(`order-row-${orderId}`);
  }

  // เช็คว่าแถว order ถูก highlight หรือไม่
  async isOrderHighlighted(orderId: string): Promise<boolean> {
    const row = this.getOrderRow(orderId);
    return await row.evaluate((el) => el.classList.contains('row-highlight'));
  }

  // จำนวนแถว order ที่มองเห็น (ไม่นับแถว empty)
  async getVisibleOrderCount(): Promise<number> {
    return await this.ordersTable.locator('tbody tr:not([data-empty])').count();
  }

  // เปิดลิงก์ใบเสร็จ (invoice) จากแถว order
  async openInvoice(orderId: string): Promise<void> {
    const row = this.getOrderRow(orderId);
    await row.locator('a.action-link').click();
    await this.waitForNetworkIdle();
  }
}
