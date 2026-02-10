import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/constants';

export class InboxPage extends BasePage {
  private readonly inboxItems: Locator;
  private readonly emailBody: Locator;

  constructor(page: Page) {
    super(page);
    this.inboxItems = this.page.locator('.inbox-item');
    this.emailBody = this.page.locator('.email-body');
  }

  async goto(): Promise<void> {
    await super.goto(routes.inbox);
  }

  async gotoDemo(): Promise<void> {
    await super.goto(routes.demoInbox);
  }

  async switchToTrash(): Promise<void> {
    await this.page.locator('a.tab-link[href="/inbox?box=trash"]').click();
    await this.waitForNetworkIdle();
  }

  async openEmailByIndex(index: number): Promise<void> {
    await this.inboxItems.nth(index).locator('.inbox-link').click();
    await this.waitForNetworkIdle();
  }

  async openEmailBySubject(subject: string): Promise<void> {
    await this.inboxItems.first().waitFor({ state: 'visible', timeout: 15_000 });

    const escaped = subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let candidate = this.page.locator('.inbox-item', { hasText: new RegExp(escaped, 'i') });

    // Fallback for reset email subject variants.
    if ((await candidate.count()) === 0 && /reset|password/i.test(subject)) {
      candidate = this.page.locator('.inbox-item', {
        hasText: /reset.*password|password.*reset|\[reset\]/i
      });
    }

    const item = (await candidate.count()) > 0 ? candidate.first() : this.inboxItems.first();
    await item.locator('.inbox-link').click();
    await this.waitForNetworkIdle();
  }

  async deleteEmailBySubject(subject: string): Promise<void> {
    const item = this.page.locator('.inbox-item', { hasText: subject });
    await item.locator('button:has-text("Trash")').click();
    await this.waitForNetworkIdle();
  }

  async restoreEmailBySubject(subject: string): Promise<void> {
    const item = this.page.locator('.inbox-item', { hasText: subject });
    await item.locator('button:has-text("Restore")').click();
    await this.waitForNetworkIdle();
  }

  async deleteForeverBySubject(subject: string): Promise<void> {
    const item = this.page.locator('.inbox-item', { hasText: subject });
    await item.locator('button:has-text("Delete")').click();
    await this.waitForNetworkIdle();
  }

  async emptyTrash(): Promise<void> {
    await this.page.locator('button:has-text("Empty Trash")').click();
    await this.waitForNetworkIdle();
  }

  async getEmailCount(): Promise<number> {
    return await this.inboxItems.count();
  }

  async getLatestSubjectText(): Promise<string> {
    await this.inboxItems.first().waitFor({ state: 'visible', timeout: 15_000 });
    return await this.inboxItems.first().locator('.subject-text').innerText();
  }

  async waitForEmailBody(): Promise<void> {
    await this.emailBody.waitFor({ state: 'visible' });
  }

  async getEmailBodyText(): Promise<string> {
    await this.waitForEmailBody();
    return await this.emailBody.innerText();
  }

  async getFirstEmailLinkHref(): Promise<string | null> {
    await this.waitForEmailBody();
    return await this.emailBody.locator('a').first().getAttribute('href');
  }
}
