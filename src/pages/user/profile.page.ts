import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/constants';

// Page object model for Profile page.
export class ProfilePage extends BasePage {
  private readonly emailInput: Locator;
  private readonly phoneInput: Locator;
  private readonly addressInput: Locator;
  private readonly saveButton: Locator;
  private readonly orderCards: Locator;
  private readonly noOrdersText: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = this.page.locator('input[name="email"]');
    this.phoneInput = this.page.locator('input[name="phone"]');
    this.addressInput = this.page.locator('textarea[name="address"]');
    this.saveButton = this.page.locator('button.btn-save');
    this.orderCards = this.page.locator('.order-card');
    this.noOrdersText = this.page.getByText(/No orders found/i);
  }

  // Open profile page (default tab is info).
  async goto(): Promise<void> {
    await super.goto(routes.profile);
  }

  // Open a specific profile tab (info | orders | claims).
  async gotoTab(tab: 'info' | 'orders' | 'claims'): Promise<void> {
    await super.goto(`${routes.profile}?tab=${tab}`);
  }

  // Update profile fields.
  async updateProfile(email?: string, phone?: string, address?: string): Promise<void> {
    if (email !== undefined) await this.emailInput.fill(email);
    if (phone !== undefined) await this.phoneInput.fill(phone);
    if (address !== undefined) await this.addressInput.fill(address);
    await this.saveButton.click();
    await this.waitForNetworkIdle();
  }

  // Count visible order cards (basic validation).
  async getOrderCount(): Promise<number> {
    return await this.orderCards.count();
  }

  orderCardByOrderId(orderId: string): Locator {
    return this.page.locator('.order-card', { hasText: orderId }).first();
  }

  async expectOrderCardVisible(orderId: string): Promise<void> {
    await expect(this.orderCardByOrderId(orderId)).toBeVisible();
  }

  async expectOrderCardContains(orderId: string, pattern: string | RegExp): Promise<void> {
    await expect(this.orderCardByOrderId(orderId)).toContainText(pattern);
  }

  async getOrderCardTextByIndex(index: number): Promise<string> {
    return await this.orderCards.nth(index).innerText();
  }

  async expectOrderHistoryHeadingVisible(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /Order History/i })).toBeVisible();
  }

  async expectAnyOrderCardVisible(): Promise<void> {
    await expect(this.orderCards.first()).toBeVisible();
  }

  async expectNoOrdersVisible(): Promise<void> {
    await expect(this.noOrdersText).toBeVisible();
  }

  async clickInvoiceLinkByOrderId(orderId: string): Promise<void> {
    await this.orderCardByOrderId(orderId)
      .getByRole('link', { name: /View Invoice/i })
      .click();
  }

  async getInvoiceHrefByOrderId(orderId: string): Promise<string | null> {
    return await this.orderCardByOrderId(orderId)
      .getByRole('link', { name: /View Invoice/i })
      .getAttribute('href');
  }

  async expectInvoiceHrefByOrderId(orderId: string, pattern: string | RegExp): Promise<void> {
    await expect(
      this.orderCardByOrderId(orderId).getByRole('link', { name: /View Invoice/i })
    ).toHaveAttribute('href', pattern);
  }
}
