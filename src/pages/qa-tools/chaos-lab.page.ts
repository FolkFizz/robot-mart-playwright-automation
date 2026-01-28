import { Page } from '@playwright/test';
import { BasePage } from '../base.page';

export class ChaoslabPage extends BasePage {
  // TODO: Implement selectors and methods
  
  constructor(page: Page) {
    super(page);
  }

  async goto() {
    // TODO: Implement navigation
    await this.page.goto('/');
  }
}
