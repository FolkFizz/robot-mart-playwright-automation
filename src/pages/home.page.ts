import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { routes } from '@config/routes';

// POM สำหรับหน้า Home / Catalog
export class HomePage extends BasePage {
  private readonly searchInput: Locator;
  private readonly sortSelect: Locator;
  private readonly minPriceInput: Locator;
  private readonly maxPriceInput: Locator;
  private readonly applyFilterButton: Locator;
  private readonly categoryList: Locator;
  private readonly emptyState: Locator;

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

  // เช็คว่ามีสินค้าในหน้าไหม
  async hasProducts(): Promise<boolean> {
    const count = await this.page.locator('[data-testid^="product-card-"]').count();
    return count > 0;
  }

  // จำนวนสินค้าในหน้า (ใช้ verify pagination ได้)
  async getProductCount(): Promise<number> {
    return await this.page.locator('[data-testid^="product-card-"]').count();
  }

  // อ่านราคาสินค้าทั้งหมดที่แสดงอยู่
  async getVisibleProductPriceTexts(): Promise<string[]> {
    return await this.page.locator('[data-testid^="product-price-"]').allInnerTexts();
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
}
