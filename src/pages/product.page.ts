import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { testIdProduct } from '@selectors/testids';

// POM สำหรับหน้า Product Detail
export class ProductPage extends BasePage {
  private readonly qtyInput: Locator;

  constructor(page: Page) {
    super(page);
    // ช่องจำนวนสินค้า
    this.qtyInput = this.getByTestId(testIdProduct.qtyInput);
  }

  // อ่านชื่อสินค้า
  async getTitle(): Promise<string> {
    return await this.getByTestId(testIdProduct.detailTitle).innerText();
  }

  // อ่านราคาสินค้า
  async getPrice(): Promise<string> {
    return await this.getByTestId(testIdProduct.detailPrice).innerText();
  }

  // ตั้งค่าจำนวนสินค้า (ใช้ fill)
  async setQuantity(qty: number): Promise<void> {
    await this.qtyInput.fill(String(qty));
  }

  // เพิ่มจำนวน (+)
  async increaseQty(): Promise<void> {
    await this.clickByTestId(testIdProduct.qtyIncrease);
  }

  // ลดจำนวน (-)
  async decreaseQty(): Promise<void> {
    await this.clickByTestId(testIdProduct.qtyDecrease);
  }

  // กดปุ่ม Add to Cart
  async addToCart(): Promise<void> {
    await this.clickByTestId(testIdProduct.addToCart);
    // ใน UI จริงมี data-status loading/idle + body data-loading
    // รอให้หน้ากลับสู่สถานะ idle (ป้องกันคลิกซ้ำเร็ว)
    await this.page.waitForFunction(
      () => document.body.getAttribute('data-loading') === 'false'
    );
  }
}
