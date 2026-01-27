import { type Page } from '@playwright/test';

/**
 * Base Page Object Model
 * Contains common methods shared across all pages.
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string) {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  async waitForURL(pattern: RegExp | string) {
    await this.page.waitForURL(pattern, { timeout: 15000 });
  }

  // Robust click that retries if covered/animating
  async smartClick(selector: string) {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible' });
    await element.click({ force: false }); 
  }
}
