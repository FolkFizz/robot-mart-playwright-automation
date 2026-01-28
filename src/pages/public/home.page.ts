import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class HomePage extends BasePage {
  readonly heroSection: Locator;
  readonly featuredProducts: Locator;
  readonly categoryCards: Locator;
  readonly searchBar: Locator;

  constructor(page: Page) {
    super(page);
    
    this.heroSection = page.locator('.hero, .banner').first();
    this.featuredProducts = page.locator('[data-testid^="featured-product-"]');
    this.categoryCards = page.locator('.category-card');
    this.searchBar = page.locator('input[name="q"]');
  }

  async goto() {
    await this.page.goto('/');
  }

  async searchProduct(query: string) {
    await this.searchBar.fill(query);
    await this.searchBar.press('Enter');
  }

  async clickCategory(category: string) {
    await this.page.click(`a[href*="category=${category}"]`);
  }
}
