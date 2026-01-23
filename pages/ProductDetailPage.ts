import { Page, Locator, expect } from '@playwright/test';

export class ProductDetailPage {
  readonly page: Page;
  readonly title: Locator;
  readonly price: Locator;
  readonly qtyInput: Locator;
  readonly qtyIncreaseButton: Locator;
  readonly qtyDecreaseButton: Locator;
  readonly addToCartButton: Locator;
  readonly body: Locator;

  constructor(page: Page) {
    this.page = page;
    this.body = page.locator('body');
    this.title = page.getByTestId('product-title');
    this.price = page.getByTestId('product-price');
    this.qtyInput = page.getByTestId('product-qty');
    this.qtyIncreaseButton = page.getByTestId('product-qty-increase');
    this.qtyDecreaseButton = page.getByTestId('product-qty-decrease');
    this.addToCartButton = page.getByTestId('product-add-to-cart');
  }

  async navigate(productId: string | number): Promise<void> {
    await this.page.goto(`/product/${productId}`, { waitUntil: 'domcontentloaded' });
  }

  async setQuantity(quantity: number): Promise<void> {
    if (await this.qtyInput.count()) {
      await this.qtyInput.fill(String(quantity));
      return;
    }
  }

  async increaseQuantity(times = 1): Promise<void> {
    if (!(await this.qtyIncreaseButton.count())) {
      return;
    }
    for (let i = 0; i < times; i += 1) {
      await this.qtyIncreaseButton.click();
    }
  }

  async decreaseQuantity(times = 1): Promise<void> {
    if (!(await this.qtyDecreaseButton.count())) {
      return;
    }
    for (let i = 0; i < times; i += 1) {
      await this.qtyDecreaseButton.click();
    }
  }

  async addToCart(): Promise<void> {
    await expect(this.addToCartButton).toBeVisible({ timeout: 15000 });
    await expect(this.body).not.toHaveAttribute('data-loading', 'true', { timeout: 15000 });
    await expect(this.addToCartButton).not.toBeDisabled();
    await this.addToCartButton.click();
    await expect(this.body).not.toHaveAttribute('data-loading', 'true', { timeout: 15000 });
  }

  async isAddToCartDisabled(): Promise<boolean> {
    if (!(await this.addToCartButton.count())) {
      return true;
    }
    return this.addToCartButton.isDisabled();
  }
}
