import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { parseMoney } from '@utils/money';

// POM สำหรับหน้า Product Detail
export class ProductPage extends BasePage {
  private readonly qtyInput: Locator;

  constructor(page: Page) {
    super(page);
    // ช่องจำนวนสินค้า
    this.qtyInput = this.getByTestId('product-qty');
  }

  // อ่านชื่อสินค้า
  async getTitle(): Promise<string> {
    return await this.getByTestId('product-title').innerText();
  }

  // อ่านราคาสินค้า
  async getPrice(): Promise<string> {
    return await this.getByTestId('product-price').innerText();
  }

  async getPriceValue(): Promise<number> {
    return parseMoney(await this.getPrice());
  }

  // ตั้งค่าจำนวนสินค้า (ใช้ fill)
  async setQuantity(qty: number): Promise<void> {
    await this.qtyInput.fill(String(qty));
  }

  // เพิ่มจำนวน (+)
  async increaseQty(): Promise<void> {
    await this.clickByTestId('product-qty-increase');
  }

  // ลดจำนวน (-)
  async decreaseQty(): Promise<void> {
    await this.clickByTestId('product-qty-decrease');
  }

  // กดปุ่ม Add to Cart
  async addToCart(): Promise<void> {
    await this.clickByTestId('product-add-to-cart');
    // ใน UI จริงมี data-status loading/idle + body data-loading
    // รอให้หน้ากลับสู่สถานะ idle (ป้องกันคลิกซ้ำเร็ว)
    await this.page.waitForFunction(
      () => document.body.getAttribute('data-loading') === 'false'
    );
  }
}
