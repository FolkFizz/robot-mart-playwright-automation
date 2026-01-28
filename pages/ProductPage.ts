import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async searchProduct(name: string) {
    // Note: Search box might not be on every page, but usually in navbar
    // Use type="text" to avoid selecting hidden inputs
    const searchInput = this.page.locator('input[name="q"][type="text"]');
    await searchInput.fill(name);
    await searchInput.press('Enter');
  }

  async selectProduct(partialName: string) {
    // Select first card that matches text
    const card = this.page.locator('[data-testid^="product-card-"]')
      .filter({ has: this.page.getByText(partialName) })
      .first();
    await card.locator('a').first().click();
  }

  async addToCart() {
    await this.page.getByTestId('product-add-to-cart').click();
    // Wait for network idle to ensure cart update
    await this.page.waitForLoadState('networkidle');
  }

  async goToCart() {
    await this.page.goto('/cart');
    await expect(this.page).toHaveURL(/\/cart/);
  }
}
