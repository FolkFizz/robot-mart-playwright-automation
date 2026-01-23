import { Page, Locator, expect } from '@playwright/test';

export class ShopPage {
  readonly page: Page;
  readonly searchInput: Locator;
  readonly productCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.locator('.header-area .search-box input[name="q"]');
    this.productCards = page.locator('[data-testid^="product-card-"]');
  }

  async navigate(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
  }

  async searchProduct(name: string): Promise<void> {
    await this.searchInput.fill(name);
    await Promise.all([
      this.page.waitForURL(/[\?&]q=/, { timeout: 10000 }),
      this.searchInput.press('Enter'),
    ]);
  }

  async openProductByName(productName: string): Promise<void> {
    const nameInCard = this.page.locator('.product-name', { hasText: productName });
    const card = this.productCards.filter({ has: nameInCard }).first();
    await expect(card).toBeVisible({ timeout: 15000 });
    await card.scrollIntoViewIfNeeded();
    const productLink = card.locator('a').first();
    await productLink.click({ force: true });
    await expect(this.page).toHaveURL(/\/product\//, { timeout: 10000 });
  }

  async pickFirstAvailableProduct(): Promise<string> {
    await expect(this.productCards.first()).toBeVisible({ timeout: 15000 });

    const totalCards = await this.productCards.count();
    for (let index = 0; index < totalCards; index += 1) {
      const card = this.productCards.nth(index);
      const cardText = (await card.innerText()).toLowerCase();
      if (cardText.includes('out of stock')) {
        continue;
      }

      const addToCartButton = card.locator('button:has-text("Add to Cart")');
      if (await addToCartButton.count()) {
        if (await addToCartButton.first().isDisabled()) {
          continue;
        }
      }

      const nameLocator = card.locator('.product-name');
      const productName = (await nameLocator.textContent())?.trim();
      if (!productName) {
        continue;
      }

      await card.scrollIntoViewIfNeeded();
      const productLink = card.locator('a').first();
      await productLink.click({ force: true });
      await expect(this.page).toHaveURL(/\/product\//, { timeout: 10000 });
      return productName;
    }

    throw new Error('No available products found (all appear out of stock).');
  }

  async goToPage(pageNumber: number): Promise<void> {
    const target = this.page.locator('.pagination .btn-page', { hasText: String(pageNumber) }).first();
    if (await target.count()) {
      await Promise.all([
        this.page.waitForURL(new RegExp(`page=${pageNumber}`)),
        target.click(),
      ]);
    }
  }

  async goToNextPage(): Promise<void> {
    const active = this.page.locator('.pagination .btn-page.active').first();
    if (!(await active.count())) {
      return;
    }

    const currentText = (await active.textContent())?.trim() ?? '';
    const currentPage = Number(currentText);
    if (!Number.isFinite(currentPage)) {
      return;
    }

    const nextPage = currentPage + 1;
    await this.goToPage(nextPage);
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  }
}
