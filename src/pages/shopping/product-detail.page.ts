import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Product Detail Page - individual product view
 */
export class ProductDetailPage extends BasePage {
  readonly productName: Locator;
  readonly productPrice: Locator;
  readonly productImage: Locator;
  readonly productDescription: Locator;
  readonly stockStatus: Locator;
  readonly addToCartButton: Locator;
  readonly quantityInput: Locator;
  readonly backToProductsLink: Locator;

  constructor(page: Page) {
    super(page);
    
    this.productName = page.locator('h1, h2').first();
    this.productPrice = page.locator('.price').first();
    this.productImage = page.locator('img').first();
    this.productDescription = page.locator('.description, p').first();
    this.stockStatus = page.locator('.stock-status');
    this.addToCartButton = page.locator('button:has-text("Add to Cart"), button:has-text("Buy")');
    this.quantityInput = page.locator('input[type="number"]');
    this.backToProductsLink = page.locator('a:has-text("Back"), a:has-text("Products")');
  }

  async goto(productId: string) {
    await this.page.goto(`/product/${productId}`);
  }

  async addToCart(quantity: number = 1) {
    if (await this.quantityInput.isVisible()) {
      await this.quantityInput.fill(quantity.toString());
    }
    await this.addToCartButton.click();
  }

  async getProductName(): Promise<string> {
    return await this.productName.textContent() || '';
  }

  async getProductPrice(): Promise<string> {
    const priceText = await this.productPrice.textContent();
    return priceText?.replace('$', '').trim() || '0';
  }

  async isInStock(): Promise<boolean> {
    const stockText = await this.stockStatus.textContent();
    return !stockText?.toLowerCase().includes('out of stock');
  }

  async goBack() {
    await this.backToProductsLink.click();
  }
}
