import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/constants';

// POM สำหรับหน้า Admin Claims
export class AdminClaimsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // เปิดหน้า claims
  async goto(): Promise<void> {
    await super.goto(routes.admin.claims);
  }

  // หา card ของ claim ด้วยเลข invoice
  getClaimCard(invoiceId: string): Locator {
    return this.page.locator('.claim-card', { hasText: invoiceId });
  }

  // อนุมัติ claim
  async approveClaim(invoiceId: string): Promise<void> {
    const card = this.getClaimCard(invoiceId);
    await card.locator('.btn-approve').click();
    await this.waitForNetworkIdle();
  }

  // ปฏิเสธ claim
  async rejectClaim(invoiceId: string): Promise<void> {
    const card = this.getClaimCard(invoiceId);
    await card.locator('.btn-reject').click();
    await this.waitForNetworkIdle();
  }
}
