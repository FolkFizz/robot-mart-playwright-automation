import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { routes } from '@config/routes';
import { testIdProduct } from '@selectors/testids';

// POM สำหรับหน้า Home / Catalog
export class HomePage extends BasePage {
  private readonly searchInput: Locator;
  private readonly sortSelect: Locator;

  constructor(page: Page) {
    super(page);
    // ช่องค้นหาในหน้า home
    this.searchInput = this.page.locator('input[name="q"]');
    // dropdown sort
    this.sortSelect = this.page.locator('select[name="sort"]');
  }

  // เปิดหน้า home
  async goto(): Promise<void> {
    await super.goto(routes.home);
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

  // คลิกสินค้าใน card ตามลำดับ (0 = ตัวแรก)
  async clickProductByIndex(index: number): Promise<void> {
    const cards = this.page.locator('[data-testid^="product-card-"]');
    await cards.nth(index).click();
    await this.waitForNetworkIdle();
  }

  // คลิกสินค้าโดยใช้ id (ถ้ารู้ id แล้ว)
  async clickProductById(id: number | string): Promise<void> {
    await this.getByTestId(testIdProduct.card(id)).click();
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
}
