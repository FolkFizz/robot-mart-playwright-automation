import { Page } from '@playwright/test';
import { BasePage } from '../base.page';

export class CategoryPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(category: string) {
    await this.page.goto(`/?category=${category}`);
  }

  async getProductCount(): Promise<number> {
    return await this.page.locator('[data-testid^="product-card-"]').count();
  }
}
