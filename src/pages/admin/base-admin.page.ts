import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Base Admin Page - common functionality for all admin pages
 */
export abstract class BaseAdminPage extends BasePage {
  readonly adminSidebar: Locator;
  readonly dashboardLink: Locator;
  readonly ordersLink: Locator;
  readonly couponsLink: Locator;
  readonly inventoryLink: Locator;
  readonly claimsLink: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page);
    
    this.adminSidebar = page.locator('.admin-sidebar, .sidebar');
    this.dashboardLink = page.locator('a[href*="/admin/dashboard"]');
    this.ordersLink = page.locator('a[href*="/admin/orders"]');
    this.couponsLink = page.locator('a[href*="/admin/coupons"]');
    this.inventoryLink = page.locator('a[href*="/admin/inventory"]');
    this.claimsLink = page.locator('a[href*="/admin/claims"]');
    this.logoutButton = page.locator('a[href*="/logout"]');
  }

  async navigateToDashboard() {
    await this.dashboardLink.click();
  }

  async navigateToOrders() {
    await this.ordersLink.click();
  }

  async navigateToCoupons() {
    await this.couponsLink.click();
  }

  async navigateToInventory() {
    await this.inventoryLink.click();
  }

  async navigateToClaims() {
    await this.claimsLink.click();
  }

  async logout() {
    await this.logoutButton.click();
  }
}
