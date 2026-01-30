import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class ProductDetailPage extends BasePage {
  // Selectors
  readonly productTitle: Locator;
  readonly productPrice: Locator;
  readonly productDescription: Locator;
  readonly productImage: Locator;
  readonly stockInfo: Locator;
  readonly quantityInput: Locator;
  readonly quantityDecrease: Locator;
  readonly quantityIncrease: Locator;
  readonly addToCartButton: Locator;
  readonly backLink: Locator;

  constructor(page: Page) {
    super(page);
    
    this.productTitle = page.locator('[data-testid="product-title"]');
    this.productPrice = page.locator('[data-testid="product-price"]');
    this.productDescription = page.locator('.description');
    this.productImage = page.locator('.product-image img');
    this.stockInfo = page.locator('.stock-info');
    this.quantityInput = page.locator('[data-testid="product-qty"]');
    this.quantityDecrease = page.locator('[data-testid="product-qty-decrease"]');
    this.quantityIncrease = page.locator('[data-testid="product-qty-increase"]');
    this.addToCartButton = page.locator('[data-testid="product-add-to-cart"]');
    this.backLink = page.locator('.back-link');
  }

  async goto(productId: string) {
    await this.page.goto(`/product/${productId}`);
  }

  async getProductTitle(): Promise<string> {
    return await this.productTitle.textContent() || '';
  }

  async getProductPrice(): Promise<string> {
    return await this.productPrice.textContent() || '';
  }

  async isInStock(): Promise<boolean> {
    const stockText = await this.stockInfo.textContent() || '';
    return stockText.includes('In Stock');
  }

  async getStockQuantity(): Promise<number> {
    const stockText = await this.stockInfo.textContent() || '';
    const match = stockText.match(/\((\d+) available\)/);
    return match ? parseInt(match[1]) : 0;
  }

  async setQuantity(quantity: number) {
    await this.quantityInput.fill(quantity.toString());
  }

  async increaseQuantity(times: number = 1) {
    for (let i = 0; i < times; i++) {
      await this.quantityIncrease.click();
    }
  }

  async decreaseQuantity(times: number = 1) {
    for (let i = 0; i < times; i++) {
      await this.quantityDecrease.click();
    }
  }

  async getQuantity(): Promise<number> {
    const value = await this.quantityInput.inputValue();
    return parseInt(value);
  }

  async addToCart() {
    await this.addToCartButton.click();
    
    // Wait for loading state
    await this.page.waitForFunction(() => {
      const btn = document.querySelector('[data-testid="product-add-to-cart"]');
      return btn?.getAttribute('data-status') === 'loading';
    }, { timeout: 2000 }).catch(() => {});
    
    // Wait for success or error
    await this.page.waitForFunction(() => {
      const body = document.body.getAttribute('data-loading');
      return body === 'false';
    }, { timeout: 5000 }).catch(() => {});
  }

  async isAddToCartDisabled(): Promise<boolean> {
    return await this.addToCartButton.isDisabled();
  }

  async goBack() {
    await this.backLink.click();
  }
}
