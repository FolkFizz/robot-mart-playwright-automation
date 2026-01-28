import { Page } from '@playwright/test';
import { BasePage } from '../base.page';

export class SearchResultsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async goto(query: string) {
    await this.page.goto(`/?q=${encodeURIComponent(query)}`);
  }

  async getResultsCount(): Promise<number> {
    return await this.page.locator('[data-testid^="product-card-"]').count();
  }

  async hasNoResults(): Promise<boolean> {
    return await this.page.locator('text=No bots found').isVisible();
  }
}
