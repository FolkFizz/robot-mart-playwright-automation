import { Page, Locator } from '@playwright/test';
import { testIdCart } from '@selectors/testids';
import type { IdLike } from '@app-types/app.types';

// Component สำหรับแถวสินค้าในตะกร้า
export class CartItemRowComponent {
  private readonly page: Page;
  private readonly id: IdLike;
  private readonly row: Locator;
  private readonly name: Locator;
  private readonly price: Locator;
  private readonly total: Locator;
  private readonly qtyValue: Locator;
  private readonly increaseButton: Locator;
  private readonly decreaseButton: Locator;
  private readonly removeButton: Locator;

  constructor(page: Page, id: IdLike) {
    this.page = page;
    this.id = id;
    this.row = page.getByTestId(testIdCart.itemRow(id));
    this.name = page.getByTestId(testIdCart.itemName(id));
    this.price = page.getByTestId(testIdCart.itemPrice(id));
    this.total = page.getByTestId(testIdCart.itemTotal(id));
    this.qtyValue = page.getByTestId(testIdCart.qtyValue(id));
    this.increaseButton = page.getByTestId(testIdCart.qtyIncrease(id));
    this.decreaseButton = page.getByTestId(testIdCart.qtyDecrease(id));
    this.removeButton = page.getByTestId(testIdCart.removeItem(id));
  }

  // เช็คว่าแถวนี้มีอยู่หรือไม่
  async isVisible(): Promise<boolean> {
    return await this.row.isVisible().catch(() => false);
  }

  // อ่านชื่อสินค้า
  async getName(): Promise<string> {
    return await this.name.innerText();
  }

  // อ่านราคาต่อชิ้น
  async getPrice(): Promise<string> {
    return await this.price.innerText();
  }

  // อ่านราคารวมของแถวนี้
  async getTotal(): Promise<string> {
    return await this.total.innerText();
  }

  // อ่านจำนวนสินค้า (แปลงเป็นตัวเลข)
  async getQuantity(): Promise<number> {
    const text = await this.qtyValue.innerText();
    const value = Number.parseInt(text, 10);
    return Number.isNaN(value) ? 0 : value;
  }

  // เพิ่มจำนวน (+)
  async increase(): Promise<void> {
    await this.increaseButton.click();
  }

  // ลดจำนวน (-)
  async decrease(): Promise<void> {
    await this.decreaseButton.click();
  }

  // ลบสินค้าออกจากตะกร้า
  async remove(): Promise<void> {
    await this.removeButton.click();
  }
}
