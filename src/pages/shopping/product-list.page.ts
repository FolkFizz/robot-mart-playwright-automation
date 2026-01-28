import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

export class ProductListPage extends BasePage {
  // Selectors from index.ejs
  readonly searchInput: Locator;
  readonly sortSelect: Locator;
  readonly categoryLinks: Locator;
  readonly productCards: Locator;
  readonly minPriceInput: Locator;
  readonly maxPriceInput: Locator;
  readonly applyFilterButton: Locator;
  readonly resetFiltersLink: Locator;
  readonly paginationButtons: Locator;

  constructor(page: Page) {
    super(page);
    this.searchInput = page.locator('input[name="q"]');
    this.sortSelect = page.locator('select[name="sort"]');
    this.categoryLinks = page.locator('.category-list a');
    this.productCards = page.locator('[data-testid^="product-card-"]');
    this.minPriceInput = page.locator('input[name="minPrice"]');
    this.maxPriceInput = page.locator('input[name="maxPrice"]');
    this.applyFilterButton = page.locator('.btn-filter');
    this.resetFiltersLink = page.locator('.reset-link');
    this.paginationButtons = page.locator('.btn-page');
  }

  async goto() {
    await this.page.goto('/');
  }

  async searchProduct(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }

  async selectCategory(category: string) {
    await this.page.click(`a[href*="category=${category}"]`);
  }

  async sortBy(sortOption: string) {
    await this.sortSelect.selectOption(sortOption);
  }

  async filterByPriceRange(min: number, max: number) {
    await this.minPriceInput.fill(min.toString());
    await this.maxPriceInput.fill(max.toString());
    await this.applyFilterButton.click();
  }

  async getProductCount(): Promise<number> {
    return await this.productCards.count();
  }

  async clickProductByIndex(index: number) {
    await this.productCards.nth(index).click();
  }

  async getProductPrice(productId: string): Promise<string> {
    const priceLocator = this.page.getByTestId(`product-price-${productId}`);
    return await priceLocator.textContent() || '';
  }

  async getProductTitle(productId: string): Promise<string> {
    const titleLocator = this.page.getByTestId(`product-title-${productId}`);
    return await titleLocator.textContent() || '';
  }
}
