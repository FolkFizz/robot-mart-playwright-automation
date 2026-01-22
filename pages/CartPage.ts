import { Page, Locator, expect } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly cartItemNames: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartItemNames = page.locator('[data-testid^="cart-item-name-"]');
    this.checkoutButton = page.getByTestId('cart-checkout');
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
}
