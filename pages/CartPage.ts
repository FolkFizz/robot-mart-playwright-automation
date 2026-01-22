import { Page, Locator, expect } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly cartItemNames: Locator;
  readonly checkoutButton: Locator;
  readonly couponInput: Locator;
  readonly applyCouponButton: Locator;
  readonly removeCouponButton: Locator;
  readonly discountValue: Locator;
  readonly grandTotal: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartItemNames = page.locator('[data-testid^="cart-item-name-"]');
    this.checkoutButton = page.getByTestId('cart-checkout');
    this.couponInput = page.getByTestId('cart-coupon-input');
    this.applyCouponButton = page.getByTestId('cart-apply-coupon');
    this.removeCouponButton = page.getByTestId('cart-remove-coupon');
    this.discountValue = page.getByTestId('cart-discount');
    this.grandTotal = page.getByTestId('cart-grand-total');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/cart', { waitUntil: 'domcontentloaded' });
  }

  async getCartItemNames(): Promise<string[]> {
    const names = await this.cartItemNames.allTextContents();
    return names.map((name) => name.trim()).filter(Boolean);
  }

  async expectItemInCart(itemName: string): Promise<void> {
    const names = await this.getCartItemNames();
    expect(names, 'Expected item to be present in cart').toContain(itemName);
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click();
  }

  async applyCoupon(code: string): Promise<void> {
    if (await this.removeCouponButton.isVisible()) {
      await this.removeCouponButton.click();
      await expect(this.applyCouponButton).toBeVisible({ timeout: 15000 });
    }

    const beforeTotal = await this.readMoney(this.grandTotal);

    await this.couponInput.fill(code);
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      this.applyCouponButton.click(),
    ]);

    await expect(this.discountValue).toBeVisible({ timeout: 15000 });
    const afterTotal = await this.readMoney(this.grandTotal);

    expect(afterTotal, 'Expected grand total to decrease after applying coupon').toBeLessThan(beforeTotal);
  }

  private async readMoney(locator: Locator): Promise<number> {
    const raw = (await locator.textContent())?.trim() ?? '';
    const normalized = raw.replace(/[^0-9.]/g, '');
    const value = Number(normalized);
    return Number.isFinite(value) ? value : 0;
  }
}
