import { Page, Locator, expect } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly cartItemNames: Locator;
  readonly checkoutButton: Locator;
  readonly couponInput: Locator;
  readonly applyCouponButton: Locator;
  readonly discountValue: Locator;
  readonly grandTotal: Locator;
  readonly body: Locator;

  constructor(page: Page) {
    this.page = page;
    this.body = page.locator('body');
    this.cartItemNames = page.locator('[data-testid^="cart-item-name-"]');
    this.checkoutButton = page.getByTestId('cart-checkout');
    this.couponInput = page.getByTestId('cart-coupon-input');
    this.applyCouponButton = page.getByTestId('cart-apply-coupon');
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

  async clearCart(): Promise<void> {
    await this.navigate();

    const clearAllButton = this.page.getByTestId('cart-clear');
    const removeButtons = this.page.locator('[data-testid^="cart-remove-"]');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (await clearAllButton.isVisible()) {
        await Promise.all([
          this.page.waitForLoadState('domcontentloaded'),
          clearAllButton.click(),
        ]);
      } else {
        const removeCount = await removeButtons.count();
        if (removeCount === 0) {
          break;
        }
        await Promise.all([
          this.page.waitForLoadState('domcontentloaded'),
          removeButtons.first().click(),
        ]);
      }
    }

    await expect(this.cartItemNames).toHaveCount(0);
  }

  async applyCoupon(code: string): Promise<void> {
    await expect(this.body).not.toHaveAttribute('data-loading', 'true', { timeout: 15000 });
    await expect(this.applyCouponButton).toBeVisible({ timeout: 15000 });
    await expect(this.applyCouponButton).not.toBeDisabled();

    const beforeTotal = await this.readMoney(this.grandTotal);

    await this.couponInput.fill(code);
    await Promise.all([
      this.page.waitForLoadState('domcontentloaded'),
      this.applyCouponButton.click(),
    ]);

    await expect(this.body).not.toHaveAttribute('data-loading', 'true', { timeout: 15000 });
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
