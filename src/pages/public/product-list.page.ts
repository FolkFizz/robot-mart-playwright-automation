import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page'; 

/**
 * Unified Catalog Page - handles product browsing, search, filtering, and sorting
 * Consolidates functionality from: product-list, category, search-results pages
 */
export class ProductListPage extends BasePage {
  // Search & Navigation
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  
  // Category Navigation
  readonly categoryLinks: Locator;
  readonly allProductsLink: Locator;
  
  // Sorting & Filtering
  readonly sortSelect: Locator;
  readonly minPriceInput: Locator;
  readonly maxPriceInput: Locator;
  readonly applyFilterButton: Locator;
  readonly resetFiltersLink: Locator;
  
  // Product Grid
  readonly productCards: Locator;
  readonly productTitles: Locator;
  readonly productPrices: Locator;
  
  // Pagination
  readonly paginationButtons: Locator;
  readonly nextPageButton: Locator;
  readonly prevPageButton: Locator;
  
  // Messages & State
  readonly totalItemsCount: Locator;
  readonly emptyResultsMessage: Locator;

  constructor(page: Page) {
    super(page);
    
    // Search
    this.searchInput = page.locator('input[name="q"]');
    this.searchButton = page.locator('button[type="submit"]');
    
    // Categories
    this.categoryLinks = page.locator('.category-list a');
    this.allProductsLink = page.locator('a[href="/"]').first();
    
    // Filters
    this.sortSelect = page.locator('select[name="sort"]');
    this.minPriceInput = page.locator('input[name="minPrice"]');
    this.maxPriceInput = page.locator('input[name="maxPrice"]');
    this.applyFilterButton = page.locator('.btn-filter');
    this.resetFiltersLink = page.locator('.reset-link');
    
    // Products
    this.productCards = page.locator('[data-testid^="product-card-"]');
    this.productTitles = page.locator('[data-testid^="product-title-"]');
    this.productPrices = page.locator('[data-testid^="product-price-"]');
    
    // Pagination
    this.paginationButtons = page.locator('.btn-page');
    this.nextPageButton = page.locator('.btn-page:has-text("›")');
    this.prevPageButton = page.locator('.btn-page:has-text("‹")');
    
    // State
    this.totalItemsCount = page.locator('.header-area span');
    this.emptyResultsMessage = page.locator('text=No bots found');
  }

  async goto(path: string = '/') {
    await this.page.goto(path);
  }

  // Search Methods
  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  async clearSearch() {
    await this.searchInput.clear();
    await this.searchInput.press('Enter');
  }

  // Category Methods
  async selectCategory(category: 'automation' | 'hazardous' | 'high_tech' | 'companion') {
    await this.page.click(`a[href*="category=${category}"]`);
    await this.page.waitForLoadState('networkidle');
  }

  async viewAllProducts() {
    await this.allProductsLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  // Sorting Methods
  async sortBy(option: 'newest' | 'price_asc' | 'price_desc' | 'name_asc') {
    await this.sortSelect.selectOption(option);
    await this.page.waitForLoadState('networkidle');
  }

  // Filtering Methods
  async filterByPriceRange(min: number, max: number) {
    await this.minPriceInput.fill(min.toString());
    await this.maxPriceInput.fill(max.toString());
    await this.applyFilterButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async resetFilters() {
    await this.resetFiltersLink.click();
    await this.page.waitForLoadState('networkidle');
  }

  // Product Interaction Methods
  async getProductCount(): Promise<number> {
    return await this.productCards.count();
  }

  async clickProduct(index: number) {
    await this.productCards.nth(index).click();
  }

  async clickProductById(productId: string) {
    await this.page.getByTestId(`product-card-${productId}`).click();
  }

  async getProductPrice(productId: string): Promise<string> {
    const priceText = await this.page.getByTestId(`product-price-${productId}`).textContent();
    return priceText?.replace('$', '').trim() || '0';
  }

  async getProductTitle(productId: string): Promise<string> {
    return await this.page.getByTestId(`product-title-${productId}`).textContent() || '';
  }

  // Pagination Methods
  async goToNextPage() {
    await this.nextPageButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToPreviousPage() {
    await this.prevPageButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async goToPage(pageNumber: number) {
    await this.page.click(`.btn-page:has-text("${pageNumber}")`);
    await this.page.waitForLoadState('networkidle');
  }

  // Validation Methods
  async hasResults(): Promise<boolean> {
    const count = await this.getProductCount();
    return count > 0;
  }

  async isEmptyResults(): Promise<boolean> {
    return await this.emptyResultsMessage.isVisible();
  }

  async getTotalItemsText(): Promise<string> {
    return await this.totalItemsCount.textContent() || '';
  }
}
