import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { routes } from '@config/constants';
import { parseMoney } from '@utils/money';

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
  private readonly checkoutLinkFallback: Locator;
  private readonly alertError: Locator;

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
    this.checkoutLinkFallback = this.page
      .locator(`a[href="${routes.order.place}"], a[href="${routes.order.checkout}"]`)
      .first();
    this.alertError = this.page
      .locator('.alert-error, .error, [role="alert"], [aria-live]')
      .first();
  }

  // เปิดหน้า cart
  async goto(): Promise<void> {
    await super.goto(routes.cart);
  }

  // จำนวนสินค้าทั้งหมดใน cart (นับจาก row)
  async getItemCount(): Promise<number> {
    return await this.page.locator('tr[data-testid^="cart-item-"]').count();
  }

  private cartItemRow(id: number | string): Locator {
    return this.getByTestId(`cart-item-${id}`);
  }

  async isItemVisible(id: number | string): Promise<boolean> {
    return await this.cartItemRow(id)
      .isVisible()
      .catch(() => false);
  }

  async getItemName(id: number | string): Promise<string> {
    return await this.getByTestId(`cart-item-name-${id}`).innerText();
  }

  async getItemPriceText(id: number | string): Promise<string> {
    return await this.getByTestId(`cart-item-price-${id}`).innerText();
  }

  async getItemPriceValue(id: number | string): Promise<number> {
    return parseMoney(await this.getItemPriceText(id));
  }

  async getItemTotalText(id: number | string): Promise<string> {
    return await this.getByTestId(`cart-item-total-${id}`).innerText();
  }

  async getItemTotalValue(id: number | string): Promise<number> {
    return parseMoney(await this.getItemTotalText(id));
  }

  async getItemQuantity(id: number | string): Promise<number> {
    const text = await this.getByTestId(`cart-qty-value-${id}`).innerText();
    const value = Number.parseInt(text, 10);
    return Number.isNaN(value) ? 0 : value;
  }

  async waitForItemQuantityAtLeast(
    id: number | string,
    minQuantity: number,
    timeoutMs = 5_000
  ): Promise<number> {
    await expect
      .poll(async () => await this.getItemQuantity(id), { timeout: timeoutMs })
      .toBeGreaterThanOrEqual(minQuantity);
    return await this.getItemQuantity(id);
  }

  // อ่าน subtotal
  async getSubtotal(): Promise<string> {
    return await this.subtotalLabel.innerText();
  }

  // อ่าน grand total
  async getGrandTotal(): Promise<string> {
    return await this.grandTotalLabel.innerText();
  }

  async getSubtotalValue(): Promise<number> {
    return parseMoney(await this.getSubtotal());
  }

  async getGrandTotalValue(): Promise<number> {
    return parseMoney(await this.getGrandTotal());
  }

  // อ่าน shipping
  async getShippingText(): Promise<string> {
    return await this.shippingLabel.innerText();
  }

  async getShippingValue(): Promise<number> {
    const text = await this.getShippingText();
    return text.trim().toUpperCase() === 'FREE' ? 0 : parseMoney(text);
  }

  // อ่าน discount
  async getDiscountText(): Promise<string> {
    return await this.discountLabel.innerText();
  }

  async getDiscountValue(): Promise<number> {
    return parseMoney(await this.getDiscountText());
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

  getCheckoutButton(): Locator {
    return this.checkoutButton;
  }

  async proceedToCheckoutWithFallback(): Promise<void> {
    if ((await this.checkoutButton.count()) > 0) {
      await expect(this.checkoutButton).toBeVisible();
      await this.checkoutButton.click();
      await this.waitForDomReady();
      return;
    }

    if ((await this.checkoutLinkFallback.count()) > 0) {
      await this.checkoutLinkFallback.click();
      await this.waitForDomReady();
    }
  }

  async getFirstAlertText(): Promise<string> {
    return await this.alertError.innerText().catch(() => '');
  }

  async hasVisibleAlert(): Promise<boolean> {
    return await this.alertError.isVisible().catch(() => false);
  }

  async expectAlertContains(pattern: string | RegExp): Promise<void> {
    await expect(this.alertError).toBeVisible();
    await expect(this.alertError).toContainText(pattern);
  }

  async isEmptyMessageVisible(text: string): Promise<boolean> {
    return await this.page
      .getByText(text)
      .isVisible()
      .catch(() => false);
  }

  async expectEmptyMessageVisible(text: string): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible();
  }

  async focusFirstQuantityControl(): Promise<void> {
    await this.page
      .locator('[data-testid^="cart-qty-increase-"], [data-testid^="cart-qty-decrease-"]')
      .first()
      .focus();
  }

  async isFirstQuantityControlFocused(): Promise<boolean> {
    const control = this.page
      .locator('[data-testid^="cart-qty-increase-"], [data-testid^="cart-qty-decrease-"]')
      .first();
    if ((await control.count()) === 0) return false;
    return await control.evaluate((el) => el === document.activeElement);
  }

  async getFirstRemoveButtonA11yMeta(): Promise<{
    ariaLabel: string | null;
    title: string | null;
    text: string;
  }> {
    const removeButton = this.page.locator('[data-testid^="cart-remove-"]').first();
    return {
      ariaLabel: await removeButton.getAttribute('aria-label'),
      title: await removeButton.getAttribute('title'),
      text: await removeButton.innerText().catch(() => '')
    };
  }

  async getCouponInputA11yMeta(): Promise<{
    ariaLabel: string | null;
    placeholder: string | null;
    id: string | null;
    hasLabelByFor: boolean;
  }> {
    const couponInput = this.page
      .locator(
        'input[name="coupon"], input[placeholder*="coupon" i], input[aria-label*="coupon" i]'
      )
      .first();
    const id = await couponInput.getAttribute('id');
    const hasLabelByFor = id ? (await this.page.locator(`label[for="${id}"]`).count()) > 0 : false;

    return {
      ariaLabel: await couponInput.getAttribute('aria-label'),
      placeholder: await couponInput.getAttribute('placeholder'),
      id,
      hasLabelByFor
    };
  }

  async focusCheckoutControl(): Promise<boolean> {
    const target = this.page
      .locator('button:has-text("checkout"), a:has-text("checkout"), button:has-text("Proceed")')
      .first();
    if ((await target.count()) === 0) return false;
    await target.focus();
    return true;
  }

  async isCheckoutControlFocused(): Promise<boolean> {
    const target = this.page
      .locator('button:has-text("checkout"), a:has-text("checkout"), button:has-text("Proceed")')
      .first();
    if ((await target.count()) === 0) return false;
    return await target.evaluate((el) => el === document.activeElement);
  }

  async getCheckoutControlTabIndex(): Promise<string | null> {
    const target = this.page
      .locator('button:has-text("checkout"), a:has-text("checkout"), button:has-text("Proceed")')
      .first();
    if ((await target.count()) === 0) return null;
    return await target.getAttribute('tabindex');
  }

  async setFirstQuantityInput(value: string): Promise<boolean> {
    const input = this.page
      .locator('input[type="number"], input[aria-label*="quantity" i]')
      .first();
    if ((await input.count()) === 0) return false;
    await input.fill(value);
    return true;
  }

  async applyInvalidCouponAndReadError(code: string): Promise<string> {
    const couponInput = this.page
      .locator('input[name="coupon"], input[placeholder*="coupon" i]')
      .first();
    const applyButton = this.page.locator('button:has-text("apply")').first();
    if ((await couponInput.count()) === 0 || (await applyButton.count()) === 0) return '';

    await couponInput.fill(code);
    await applyButton.click();
    await this.alertError.waitFor({ state: 'visible', timeout: 3_000 }).catch(() => undefined);
    return await this.getFirstAlertText();
  }
}
