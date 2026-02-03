import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { routes } from '@config/routes';
import { testIdCart } from '@selectors/testids';

// POM สำหรับหน้า Cart
export class CartPage extends BasePage {
  private readonly couponInput: Locator;

  constructor(page: Page) {
    super(page);
    this.couponInput = this.getByTestId(testIdCart.couponInput);
  }

  // เปิดหน้า cart
  async goto(): Promise<void> {
    await super.goto(routes.cart);
  }

  // จำนวนสินค้าทั้งหมดใน cart (นับจาก row)
  async getItemCount(): Promise<number> {
    return await this.page.locator('tr[data-testid^="cart-item-"]').count();
  }

  // อ่าน subtotal
  async getSubtotal(): Promise<string> {
    return await this.getByTestId(testIdCart.subtotal).innerText();
  }

  // อ่าน grand total
  async getGrandTotal(): Promise<string> {
    return await this.getByTestId(testIdCart.grandTotal).innerText();
  }

  // เพิ่มจำนวนสินค้าใน cart
  async increaseQtyById(id: number | string): Promise<void> {
    await this.getByTestId(testIdCart.qtyIncrease(id)).click();
    await this.waitForNetworkIdle();
  }

  // ลดจำนวนสินค้าใน cart
  async decreaseQtyById(id: number | string): Promise<void> {
    await this.getByTestId(testIdCart.qtyDecrease(id)).click();
    await this.waitForNetworkIdle();
  }

  // ลบสินค้าออกจาก cart
  async removeItemById(id: number | string): Promise<void> {
    await this.getByTestId(testIdCart.removeItem(id)).click();
    await this.waitForNetworkIdle();
  }

  // ใส่คูปอง
  async applyCoupon(code: string): Promise<void> {
    await this.couponInput.fill(code);
    await this.clickByTestId(testIdCart.applyCoupon);
    await this.waitForNetworkIdle();
  }

  // เอาคูปองออก
  async removeCoupon(): Promise<void> {
    await this.clickByTestId(testIdCart.removeCoupon);
    await this.waitForNetworkIdle();
  }

  // เคลียร์ตะกร้าทั้งหมด
  async clearCart(): Promise<void> {
    await this.clickByTestId(testIdCart.clearCart);
    await this.waitForNetworkIdle();
  }

  // ไปหน้า checkout
  async proceedToCheckout(): Promise<void> {
    await this.clickByTestId(testIdCart.checkout);
    await this.waitForNetworkIdle();
  }
}
