import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { routes } from '@config/routes';

// POM สำหรับหน้า Cart
export class CartPage extends BasePage {
  private readonly couponInput: Locator;
  private readonly applyCouponButton: Locator;
  private readonly removeCouponButton: Locator;
  private readonly subtotalLabel: Locator;
  private readonly discountLabel: Locator;
  private readonly shippingLabel: Locator;
  private readonly grandTotalLabel: Locator;
  private readonly clearCartButton: Locator;
  private readonly checkoutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.couponInput = this.getByTestId('cart-coupon-input');
    this.applyCouponButton = this.getByTestId('cart-apply-coupon');
    this.removeCouponButton = this.getByTestId('cart-remove-coupon');
    this.subtotalLabel = this.getByTestId('cart-subtotal');
    this.discountLabel = this.getByTestId('cart-discount');
    this.shippingLabel = this.getByTestId('cart-shipping');
    this.grandTotalLabel = this.getByTestId('cart-grand-total');
    this.clearCartButton = this.getByTestId('cart-clear');
    this.checkoutButton = this.getByTestId('cart-checkout');
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
    return await this.subtotalLabel.innerText();
  }

  // อ่าน grand total
  async getGrandTotal(): Promise<string> {
    return await this.grandTotalLabel.innerText();
  }

  // อ่าน shipping
  async getShippingText(): Promise<string> {
    return await this.shippingLabel.innerText();
  }

  // อ่าน discount
  async getDiscountText(): Promise<string> {
    return await this.discountLabel.innerText();
  }

  // ตรวจว่ามี discount แสดงหรือไม่
  async isDiscountVisible(): Promise<boolean> {
    return await this.discountLabel.isVisible().catch(() => false);
  }

  // ตรวจว่า coupon input แสดงหรือไม่
  async isCouponInputVisible(): Promise<boolean> {
    return await this.couponInput.isVisible().catch(() => false);
  }

  // ตรวจว่าปุ่ม remove coupon แสดงหรือไม่
  async isRemoveCouponVisible(): Promise<boolean> {
    return await this.removeCouponButton.isVisible().catch(() => false);
  }

  // เพิ่มจำนวนสินค้าใน cart
  async increaseQtyById(id: number | string): Promise<void> {
    await this.getByTestId(`cart-qty-increase-${id}`).click();
    await this.waitForNetworkIdle();
  }

  // ลดจำนวนสินค้าใน cart
  async decreaseQtyById(id: number | string): Promise<void> {
    await this.getByTestId(`cart-qty-decrease-${id}`).click();
    await this.waitForNetworkIdle();
  }

  // ลบสินค้าออกจาก cart
  async removeItemById(id: number | string): Promise<void> {
    await this.getByTestId(`cart-remove-${id}`).click();
    await this.waitForNetworkIdle();
  }

  // ใส่คูปอง
  async applyCoupon(code: string): Promise<void> {
    await this.couponInput.fill(code);
    await this.applyCouponButton.click();
    await this.waitForNetworkIdle();
  }

  // เอาคูปองออก
  async removeCoupon(): Promise<void> {
    await this.removeCouponButton.click();
    await this.waitForNetworkIdle();
  }

  // เคลียร์ตะกร้าทั้งหมด
  async clearCart(): Promise<void> {
    await this.clearCartButton.click();
    await this.waitForNetworkIdle();
  }

  // ไปหน้า checkout
  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
    await this.waitForNetworkIdle();
  }
}
