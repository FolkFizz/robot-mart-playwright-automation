import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { routes } from '@config/constants';
import { parseMoney } from '@utils/money';

// POM สำหรับหน้า Home / Catalog
export class HomePage extends BasePage {
  private readonly searchInput: Locator;
  private readonly sortSelect: Locator;
  private readonly minPriceInput: Locator;
  private readonly maxPriceInput: Locator;
  private readonly applyFilterButton: Locator;
  private readonly categoryList: Locator;
  private readonly emptyState: Locator;
  private readonly navigation: Locator;
  private readonly headingAllProducts: Locator;

  constructor(page: Page) {
    super(page);
    // ช่องค้นหาในหน้า home
    this.searchInput = this.page.getByPlaceholder('Search models...');
    // dropdown sort
    this.sortSelect = this.page.locator('.sort-select');
    // price filters
    this.minPriceInput = this.page.locator('input.filter-input[name="minPrice"]');
    this.maxPriceInput = this.page.locator('input.filter-input[name="maxPrice"]');
    this.applyFilterButton = this.page.locator('.btn-filter');
    // category list
    this.categoryList = this.page.locator('.category-list');
    // empty state
    this.emptyState = this.page.getByText('No bots found matching your criteria.');
    this.navigation = this.page.locator('nav, .navbar, .header, [role="navigation"]').first();
    this.headingAllProducts = this.page.getByRole('heading', { name: /All Products/i });
  }

  // เปิดหน้า home
  async goto(): Promise<void> {
    await super.goto(routes.home);
  }

  // เปิดหน้า home พร้อม query string
  async gotoWithQuery(query: string): Promise<void> {
    if (!query) {
      await this.goto();
      return;
    }
    const suffix = query.startsWith('?') ? query : `?${query}`;
    await super.goto(`${routes.home}${suffix}`);
  }

  // locator ของ search input
  getSearchInput(): Locator {
    return this.searchInput;
  }

  // locator ของ sort select
  getSortSelect(): Locator {
    return this.sortSelect;
  }

  // locator ของ category list
  getCategoryList(): Locator {
    return this.categoryList;
  }

  // ค้นหาสินค้า
  async search(text: string): Promise<void> {
    await this.searchInput.fill(text);
    await this.searchInput.press('Enter');
    await this.waitForNetworkIdle();
  }

  // เลือก category จาก sidebar (เช่น automation/hazardous/high_tech/companion)
  async selectCategory(category: string): Promise<void> {
    const link = this.page.locator(`a[href="/?category=${category}"]`);
    await link.click();
    await this.waitForNetworkIdle();
  }

  // เลือก sort (newest | price_asc | price_desc | name_asc)
  async selectSort(sortValue: string): Promise<void> {
    await this.sortSelect.selectOption(sortValue);
    await this.waitForNetworkIdle();
  }

  // กรองราคาตามช่วง
  async applyPriceFilter(min: number | string, max: number | string): Promise<void> {
    await this.minPriceInput.fill(String(min));
    await this.maxPriceInput.fill(String(max));
    await this.applyFilterButton.click();
    await this.waitForNetworkIdle();
  }

  // คลิกสินค้าใน card ตามลำดับ (0 = ตัวแรก)
  async clickProductByIndex(index: number): Promise<void> {
    const cards = this.page.locator('[data-testid^="product-card-"]');
    await cards.nth(index).click();
    await this.waitForNetworkIdle();
  }

  // คลิกสินค้าโดยใช้ id (ถ้ารู้ id แล้ว)
  async clickProductById(id: number | string): Promise<void> {
    await this.getByTestId(`product-card-${id}`).click();
    await this.waitForNetworkIdle();
  }

  private productCardRoot(id: number | string): Locator {
    return this.getByTestId(`product-card-${id}`);
  }

  async waitForProductCardVisible(id: number | string): Promise<void> {
    await this.productCardRoot(id).waitFor({ state: 'visible' });
  }

  async isProductCardVisible(id: number | string): Promise<boolean> {
    return await this.productCardRoot(id).isVisible().catch(() => false);
  }

  async getProductCardTitle(id: number | string): Promise<string> {
    return await this.getByTestId(`product-title-${id}`).innerText();
  }

  async expectProductCardTitleContains(id: number | string, pattern: string | RegExp): Promise<void> {
    await expect(this.getByTestId(`product-title-${id}`)).toContainText(pattern);
  }

  async getProductCardPriceText(id: number | string): Promise<string> {
    return await this.getByTestId(`product-price-${id}`).innerText();
  }

  async getProductCardPriceValue(id: number | string): Promise<number> {
    return parseMoney(await this.getProductCardPriceText(id));
  }

  async getProductCardCategory(id: number | string): Promise<string> {
    return await this.productCardRoot(id).locator('.badge').innerText();
  }

  async getProductStockStatus(id: number | string): Promise<string> {
    return await this.productCardRoot(id).locator('.stock-status').innerText();
  }

  async isProductOutOfStock(id: number | string): Promise<boolean> {
    const text = (await this.getProductStockStatus(id)).toLowerCase();
    return text.includes('out of stock');
  }

  // เช็คว่ามีสินค้าในหน้าไหม
  async hasProducts(): Promise<boolean> {
    const count = await this.page.locator('[data-testid^="product-card-"]').count();
    return count > 0;
  }

  // จำนวนสินค้าในหน้า (ใช้ verify pagination ได้)
  async getProductCount(): Promise<number> {
    return await this.page.locator('[data-testid^="product-card-"]').count();
  }

  async isNavigationVisible(): Promise<boolean> {
    return await this.navigation.isVisible().catch(() => false);
  }

  // อ่านราคาสินค้าทั้งหมดที่แสดงอยู่
  async getVisibleProductPriceTexts(): Promise<string[]> {
    return await this.page.locator('[data-testid^="product-price-"]').allInnerTexts();
  }

  async getVisibleProductPriceValues(): Promise<number[]> {
    const texts = await this.getVisibleProductPriceTexts();
    return texts.map((text) => parseMoney(text));
  }

  // อ่านชื่อสินค้าทั้งหมดที่แสดงอยู่
  async getVisibleProductTitleTexts(): Promise<string[]> {
    return await this.page.locator('[data-testid^="product-title-"]').allInnerTexts();
  }

  // อ่าน badge ตัวแรก (ช่วยเช็ค category)
  async getFirstBadgeText(): Promise<string> {
    return await this.page.locator('.badge').first().innerText();
  }

  // รอให้ empty state แสดง
  async waitForEmptyState(): Promise<void> {
    await this.emptyState.waitFor({ state: 'visible' });
  }

  // เช็คว่า empty state แสดงหรือไม่
  async isEmptyStateVisible(): Promise<boolean> {
    return await this.emptyState.isVisible().catch(() => false);
  }

  getA11yExcludeSelectors(): string[] {
    return [
      '.chat-toggle',
      '.reset-link',
      'h2 > span',
      '.stock-status .in-stock',
      'select.sort-select'
    ];
  }

  getContrastIncludeSelectors(): string[] {
    return [
      'input[placeholder="Search models..."]',
      'input.filter-input[name="minPrice"]',
      'input.filter-input[name="maxPrice"]',
      '.btn-filter'
    ];
  }

  async pressTabFromPageRoot(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }

  async isFocusedElementVisible(): Promise<boolean> {
    return await this.page.locator(':focus').isVisible().catch(() => false);
  }

  async getFocusedElementTagName(): Promise<string> {
    return await this.page.locator(':focus').evaluate((el) => el.tagName.toLowerCase());
  }

  async focusSearchInput(): Promise<void> {
    await this.searchInput.focus();
  }

  async isSearchInputFocused(): Promise<boolean> {
    return await this.searchInput.evaluate((el) => el === document.activeElement);
  }

  async submitSearchWithEnter(term: string): Promise<void> {
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
  }

  async hasResultsOrEmptyState(): Promise<boolean> {
    const hasAnyResult = (await this.getProductCount()) > 0;
    const emptyStateVisible = await this.isEmptyStateVisible();
    return hasAnyResult || emptyStateVisible;
  }

  async focusFirstCategoryLink(): Promise<void> {
    await this.page.locator('.category-list a[href*="category="]').first().focus();
  }

  async isFirstCategoryLinkFocused(): Promise<boolean> {
    const categoryLink = this.page.locator('.category-list a[href*="category="]').first();
    return await categoryLink.evaluate((el) => el === document.activeElement);
  }

  async activateFocusedElement(): Promise<void> {
    await this.page.keyboard.press('Enter');
  }

  async focusSortSelect(): Promise<void> {
    await this.sortSelect.focus();
  }

  async isSortSelectFocused(): Promise<boolean> {
    return await this.sortSelect.evaluate((el) => el === document.activeElement);
  }

  async isCatalogHeadingVisible(): Promise<boolean> {
    return await this.headingAllProducts.isVisible().catch(() => false);
  }

  async getProductCardViewportMetrics(id: number | string): Promise<{
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
    viewportWidth: number;
    viewportHeight: number;
  }> {
    const card = this.getByTestId(`product-card-${id}`);
    return await card.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      };
    });
  }

  async scrollProductCardIntoView(id: number | string): Promise<void> {
    await this.getByTestId(`product-card-${id}`).scrollIntoViewIfNeeded();
  }

  async isFirstCategoryLinkVisible(): Promise<boolean> {
    return await this.page.locator('.category-list a[href*="category="]').first().isVisible().catch(() => false);
  }

  async isSortSelectVisible(): Promise<boolean> {
    return await this.sortSelect.isVisible().catch(() => false);
  }
}
