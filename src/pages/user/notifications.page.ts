import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

// POM สำหรับ Notifications (อยู่ใน navbar dropdown)
export class NotificationsPage extends BasePage {
  private readonly bellButton: Locator;
  private readonly dropdown: Locator;
  private readonly notifItems: Locator;
  private readonly markReadButton: Locator;

  constructor(page: Page) {
    super(page);
    this.bellButton = this.getByTestId('nav-bell');
    this.dropdown = this.page.locator('#notifDropdown');
    this.notifItems = this.page.locator('#notifItemsContainer .notif-item');
    this.markReadButton = this.page.locator('#markNotificationsRead');
  }

  // เปิด dropdown แจ้งเตือน
  async open(): Promise<void> {
    await this.bellButton.click();
    await this.dropdown.waitFor({ state: 'visible' });
  }

  // กด Mark all read
  async markAllRead(): Promise<void> {
    await this.markReadButton.click();
  }

  // จำนวนแจ้งเตือนทั้งหมด
  async getNotificationCount(): Promise<number> {
    return await this.notifItems.count();
  }
}
