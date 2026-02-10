import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/constants';

// Page object model for Admin Claims page.
export class AdminClaimsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Open admin claims page.
  async goto(): Promise<void> {
    await super.goto(routes.admin.claims);
  }

  // Find claim card by invoice id.
  getClaimCard(invoiceId: string): Locator {
    return this.page.locator('.claim-card', { hasText: invoiceId });
  }

  // Approve claim by invoice id.
  async approveClaim(invoiceId: string): Promise<void> {
    const card = this.getClaimCard(invoiceId);
    await card.locator('.btn-approve').click();
    await this.waitForNetworkIdle();
  }

  // Reject claim by invoice id.
  async rejectClaim(invoiceId: string): Promise<void> {
    const card = this.getClaimCard(invoiceId);
    await card.locator('.btn-reject').click();
    await this.waitForNetworkIdle();
  }
}
