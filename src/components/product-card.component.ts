import { Page, Locator } from '@playwright/test';
import type { IdLike } from '@app-types/app.types';

// Component สำหรับการ์ดสินค้าในหน้า Catalog
export class ProductCardComponent {
  private readonly page: Page;
  private readonly id: IdLike;
  private readonly root: Locator;
  private readonly title: Locator;
  private readonly price: Locator;
  private readonly stockStatus: Locator;
  private readonly badge: Locator;

  constructor(page: Page, id: IdLike) {
    this.page = page;
    this.id = id;
    this.root = page.getByTestId(`product-card-${id}`);
    this.title = page.getByTestId(`product-title-${id}`);
    this.price = page.getByTestId(`product-price-${id}`);
    this.stockStatus = this.root.locator('.stock-status');
    this.badge = this.root.locator('.badge');
  }

  // รอให้การ์ดแสดง
  async waitForVisible(): Promise<void> {
    await this.root.waitFor({ state: 'visible' });
  }

  // เช็คว่าการ์ดแสดงหรือไม่
  async isVisible(): Promise<boolean> {
    return await this.root.isVisible().catch(() => false);
  }

  // คลิกการ์ดเพื่อไปหน้ารายละเอียดสินค้า
  async click(): Promise<void> {
    await this.root.click();
  }

  // อ่านชื่อสินค้า
  async getTitle(): Promise<string> {
    return await this.title.innerText();
  }

  // อ่านราคา (string รวมสัญลักษณ์)
  async getPrice(): Promise<string> {
    return await this.price.innerText();
  }

  // แปลงราคาเป็นตัวเลข
  async getPriceValue(): Promise<number> {
    const text = await this.getPrice();
    const value = Number.parseFloat(text.replace(/[^0-9.]/g, ''));
    return Number.isNaN(value) ? 0 : value;
  }

  // อ่านสถานะสต็อก (ข้อความจาก UI)
  async getStockStatus(): Promise<string> {
    return await this.stockStatus.innerText();
  }

  // อ่านหมวดหมู่จาก badge
  async getCategory(): Promise<string> {
    return await this.badge.innerText();
  }

  // เช็คว่าเป็นของหมดสต็อกหรือไม่
  async isOutOfStock(): Promise<boolean> {
    const text = (await this.getStockStatus()).toLowerCase();
    return text.includes('out of stock');
  }
}
