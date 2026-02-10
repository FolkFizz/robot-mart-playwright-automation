import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/constants';

// Page object model for Admin Coupons page.
export class AdminCouponsPage extends BasePage {
  private readonly codeInput: Locator;
  private readonly discountInput: Locator;
  private readonly expiryInput: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.codeInput = this.page.locator('input[name="code"]');
    this.discountInput = this.page.locator('input[name="discount"]');
    this.expiryInput = this.page.locator('input[name="expiry_days"]');
    this.submitButton = this.page.locator('button[type="submit"]');
  }

  // Open admin coupons page.
  async goto(): Promise<void> {
    await super.goto(routes.admin.coupons);
  }

  // Create a new coupon.
  async createCoupon(code: string, discount: number, days: number): Promise<void> {
    await this.codeInput.fill(code);
    await this.discountInput.fill(String(discount));
    await this.expiryInput.fill(String(days));
    await this.submitButton.click();
    await this.waitForNetworkIdle();
  }

  // Find coupon card by code.
  getCouponCard(code: string): Locator {
    return this.page.locator('.coupon-card', { hasText: code });
  }

  // Delete coupon by code.
  async deleteCoupon(code: string): Promise<void> {
    const card = this.getCouponCard(code);
    await card.locator('form button[type="submit"]').click();
    await this.waitForNetworkIdle();
  }
}
