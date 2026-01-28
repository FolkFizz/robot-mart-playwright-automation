import { Page, Locator } from '@playwright/test';
import { BaseAdminPage } from './base-admin.page';

export class AdminDashboardPage extends BaseAdminPage {
  readonly totalOrdersCard: Locator;
  readonly totalRevenueCard: Locator;
  readonly pendingOrdersCard: Locator;
  readonly activeClaimsCard: Locator;
  
  // Quick Actions
  readonly stockResetButton: Locator;
  readonly viewOrdersButton: Locator;
  readonly manageCouponsButton: Locator;

  constructor(page: Page) {
    super(page);
    
    this.totalOrdersCard = page.locator('.card:has-text("Total Orders"), .stat-card').first();
    this.totalRevenueCard = page.locator('.card:has-text("Revenue")');
    this.pendingOrdersCard = page.locator('.card:has-text("Pending")');
    this.activeClaimsCard = page.locator('.card:has-text("Claims")');
    
    this.stockResetButton = page.locator('button:has-text("Reset Stock"), a:has-text("Reset Stock")');
    this.viewOrdersButton = page.locator('a:has-text("View Orders")');
    this.manageCouponsButton = page.locator('a:has-text("Manage Coupons")');
  }

  async goto() {
    await this.page.goto('/admin/dashboard');
  }

  async resetStock() {
    await this.stockResetButton.click();
    // Wait for confirmation or success message
    await this.page.waitForTimeout(1000);
  }

  async getTotalOrders(): Promise<string> {
    return await this.totalOrdersCard.textContent() || '0';
  }

  async getTotalRevenue(): Promise<string> {
    return await this.totalRevenueCard.textContent() || '0';
  }
}
