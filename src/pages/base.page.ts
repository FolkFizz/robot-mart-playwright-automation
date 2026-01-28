import { Page } from '@playwright/test';

export abstract class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async waitForUrl(urlOrRegExp: string | RegExp) {
    await this.page.waitForURL(urlOrRegExp);
  }
}
