import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/routes';

// POM สำหรับหน้า Inbox (Email Box)
export class InboxPage extends BasePage {
  private readonly inboxItems: Locator;

  constructor(page: Page) {
    super(page);
    this.inboxItems = this.page.locator('.inbox-item');
  }

  // เปิดหน้า inbox ของ user
  async goto(): Promise<void> {
    await super.goto(routes.inbox);
  }

  // เปิด demo inbox (ไม่ต้อง login)
  async gotoDemo(): Promise<void> {
    await super.goto(routes.demoInbox);
  }

  // สลับไปดู Trash
  async switchToTrash(): Promise<void> {
    await this.page.locator('a.tab-link[href="/inbox?box=trash"]').click();
    await this.waitForNetworkIdle();
  }

  // เปิดอีเมลตาม index
  async openEmailByIndex(index: number): Promise<void> {
    await this.inboxItems.nth(index).locator('.inbox-link').click();
    await this.waitForNetworkIdle();
  }

  // เปิดอีเมลตาม subject
  async openEmailBySubject(subject: string): Promise<void> {
    const item = this.page.locator('.inbox-item', { hasText: subject });
    await item.locator('.inbox-link').click();
    await this.waitForNetworkIdle();
  }

  // ลบอีเมลลง Trash ตาม subject
  async deleteEmailBySubject(subject: string): Promise<void> {
    const item = this.page.locator('.inbox-item', { hasText: subject });
    await item.locator('button:has-text("Trash")').click();
    await this.waitForNetworkIdle();
  }

  // Restore อีเมลจาก Trash ตาม subject
  async restoreEmailBySubject(subject: string): Promise<void> {
    const item = this.page.locator('.inbox-item', { hasText: subject });
    await item.locator('button:has-text("Restore")').click();
    await this.waitForNetworkIdle();
  }

  // ลบถาวรอีเมลจาก Trash ตาม subject
  async deleteForeverBySubject(subject: string): Promise<void> {
    const item = this.page.locator('.inbox-item', { hasText: subject });
    await item.locator('button:has-text("Delete")').click();
    await this.waitForNetworkIdle();
  }

  // ล้าง Trash ทั้งหมด
  async emptyTrash(): Promise<void> {
    await this.page.locator('button:has-text("Empty Trash")').click();
    await this.waitForNetworkIdle();
  }

  // จำนวนอีเมลทั้งหมดใน list
  async getEmailCount(): Promise<number> {
    return await this.inboxItems.count();
  }
}
