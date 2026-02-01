import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/routes';

// POM สำหรับหน้า Admin Inventory
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

  // เปิดหน้า inventory
  async goto(): Promise<void> {
    await super.goto(routes.admin.inventory);
  }

  // ฟิลเตอร์ตาม category และคำค้นหา
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

  // หาแถวสินค้าโดยชื่อสินค้า
  getRowByProductName(name: string): Locator {
    return this.page.locator('table.data-table tbody tr', { hasText: name });
  }

  // อ่านค่า stock badge ตามชื่อสินค้า
  async getStockByProductName(name: string): Promise<string> {
    const row = this.getRowByProductName(name);
    return await row.locator('.stock-badge').innerText();
  }

  // กดปุ่มแก้ไขสินค้าตามชื่อสินค้า
  async openEditByProductName(name: string): Promise<void> {
    const row = this.getRowByProductName(name);
    await row.locator('.btn-edit').click();
    await this.waitForNetworkIdle();
  }
}
