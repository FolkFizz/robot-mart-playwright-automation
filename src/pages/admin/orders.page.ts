import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

// POM สำหรับหน้า Admin Orders
export class AdminOrdersPage extends BasePage {
  private readonly table: Locator;

  constructor(page: Page) {
    super(page);
    this.table = this.page.locator('table');
  }

  // เปิดหน้า orders
  async goto(): Promise<void> {
    await super.goto('/admin/orders');
  }

  // หาแถว order ตาม orderId
  getOrderRow(orderId: string): Locator {
    return this.table.locator('tbody tr', { hasText: orderId });
  }

  // เปิดดูรายการสินค้าใน order (กด summary)
  async toggleItems(orderId: string): Promise<void> {
    const row = this.getOrderRow(orderId);
    await row.locator('summary').click();
  }

  // จำนวน order ทั้งหมดในตาราง (ไม่นับแถว empty)
  async getOrderCount(): Promise<number> {
    return await this.table.locator('tbody tr:not([data-empty])').count();
  }
}
