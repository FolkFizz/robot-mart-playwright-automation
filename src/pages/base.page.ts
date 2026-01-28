import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string = '') {
    await this.page.goto(path);
  }

  async waitForUrl(urlOrRegExp: string | RegExp, options?: { timeout?: number }) {
    await this.page.waitForURL(urlOrRegExp, options);
  }

  async waitForSelector(selector: string, options?: { timeout?: number; state?: 'attached' | 'detached' | 'visible' | 'hidden' }) {
    await this.page.waitForSelector(selector, options);
  }

  getElement(selector: string): Locator {
    return this.page.locator(selector);
  }

  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async reload() {
    await this.page.reload();
  }

  async goBack() {
    await this.page.goBack();
  }

  async screenshot(options?: { path?: string; fullPage?: boolean }): Promise<Buffer> {
    return await this.page.screenshot(options);
  }
}
