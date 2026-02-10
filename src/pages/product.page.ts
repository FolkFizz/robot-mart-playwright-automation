import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { parseMoney } from '@utils/money';
import { routes } from '@config/constants';

// Page object model for Product Detail page.
export class ProductPage extends BasePage {
  private readonly qtyInput: Locator;
  private readonly addToCartButton: Locator;
  private readonly productImage: Locator;

  constructor(page: Page) {
    super(page);
    // Quantity input field.
    this.qtyInput = this.getByTestId('product-qty');
    this.addToCartButton = this.getByTestId('product-add-to-cart');
    this.productImage = this.page
      .locator('[data-testid="product-image"], .product-image img, .product-detail img')
      .first();
  }

  async gotoById(id: number | string): Promise<void> {
    await super.goto(routes.productDetail(id));
  }

  // Read product title.
  async getTitle(): Promise<string> {
    return await this.getByTestId('product-title').innerText();
  }

  // Read product price text.
  async getPrice(): Promise<string> {
    return await this.getByTestId('product-price').innerText();
  }

  async getPriceValue(): Promise<number> {
    return parseMoney(await this.getPrice());
  }

  async getImageSrc(): Promise<string | null> {
    return await this.productImage.getAttribute('src');
  }

  // Set product quantity via input fill.
  async setQuantity(qty: number): Promise<void> {
    await this.qtyInput.fill(String(qty));
  }

  // Increase quantity (+).
  async increaseQty(): Promise<void> {
    await this.clickByTestId('product-qty-increase');
  }

  // Decrease quantity (-).
  async decreaseQty(): Promise<void> {
    await this.clickByTestId('product-qty-decrease');
  }

  // Click Add to Cart.
  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
    // The sandbox UI exposes loading state through data attributes.
    // Wait until page returns to idle to avoid rapid duplicate actions.
    await this.page.waitForFunction(() => document.body.getAttribute('data-loading') === 'false');
  }

  async isAddToCartVisible(): Promise<boolean> {
    return await this.addToCartButton.isVisible().catch(() => false);
  }

  async isAddToCartDisabled(): Promise<boolean> {
    if (!(await this.isAddToCartVisible())) return false;
    return await this.addToCartButton.isDisabled();
  }
}
