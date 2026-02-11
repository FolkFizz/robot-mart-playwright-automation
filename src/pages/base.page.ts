import { Page, Locator } from '@playwright/test';

// Base class shared by all Page Objects.

export class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private isTransientNavigationError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error ?? '');
    return [
      'ERR_INTERNET_DISCONNECTED',
      'ERR_NETWORK_CHANGED',
      'ERR_CONNECTION_RESET',
      'ERR_CONNECTION_CLOSED',
      'ERR_CONNECTION_ABORTED',
      'ERR_TIMED_OUT',
      'ERR_NAME_NOT_RESOLVED',
      'Navigation timeout'
    ].some((needle) => message.includes(needle));
  }

  // Navigate to any path and wait for DOM content to load.
  async goto(path: string): Promise<void> {
    const maxAttempts = process.env.CI ? 3 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.page.goto(path, { waitUntil: 'domcontentloaded' });
        return;
      } catch (error) {
        const shouldRetry = attempt < maxAttempts && this.isTransientNavigationError(error);
        if (!shouldRetry) throw error;
        await this.page.waitForTimeout(attempt * 1000);
      }
    }
  }

  // Helper to find an element by data-testid.
  getByTestId(id: string): Locator {
    return this.page.getByTestId(id);
  }

  // Helper to find an element with a regular selector.
  locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  // Click an element by data-testid.
  async clickByTestId(id: string): Promise<void> {
    await this.getByTestId(id).click();
  }

  // Fill an input by data-testid.
  async fillByTestId(id: string, value: string): Promise<void> {
    await this.getByTestId(id).fill(value);
  }

  // Read text content by data-testid.
  async textByTestId(id: string): Promise<string> {
    return await this.getByTestId(id).innerText();
  }

  // Wait until DOM content is fully loaded.
  async waitForDomReady(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
  }

  // Wait until the network is idle (useful on data-heavy pages).
  async waitForNetworkIdle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async reloadDomReady(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
  }

  async sleep(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  async getBodyText(): Promise<string> {
    return await this.page
      .locator('body')
      .innerText()
      .catch(() => '');
  }

  // Wait for a toast notification (default: wait for visible).
  async waitForToast(
    options: {
      testId?: string;
      selector?: string;
      state?: 'visible' | 'hidden' | 'attached' | 'detached';
      timeout?: number;
    } = {}
  ): Promise<void> {
    const {
      testId,
      // Sandbox UI uses .alert / .alert-success / .alert-error for notices.
      selector = '.alert, .alert-success, .alert-error',
      state = 'visible',
      timeout = 5000
    } = options;

    const target = testId ? this.getByTestId(testId) : this.page.locator(selector);
    await target.first().waitFor({ state, timeout });
  }

  // Wait for spinner state (default: wait until hidden).
  async waitForSpinner(
    options: {
      testId?: string;
      selector?: string;
      state?: 'visible' | 'hidden' | 'attached' | 'detached';
      timeout?: number;
    } = {}
  ): Promise<void> {
    const {
      testId,
      // Sandbox UI uses #spinner and .spinner for loading indicators.
      selector = '#spinner, .spinner',
      state = 'hidden',
      timeout = 10000
    } = options;

    const target = testId ? this.getByTestId(testId) : this.page.locator(selector);
    await target.first().waitFor({ state, timeout });
  }

  private navCartLink(): Locator {
    return this.getByTestId('nav-cart-link');
  }

  private navCartCount(): Locator {
    return this.getByTestId('nav-cart-count');
  }

  private navBellTrigger(): Locator {
    return this.getByTestId('nav-bell');
  }

  private navAccountMenu(): Locator {
    return this.getByTestId('nav-account-menu');
  }

  private navProfileTrigger(): Locator {
    return this.getByTestId('nav-profile');
  }

  private navLogoutLink(): Locator {
    return this.getByTestId('logout-link');
  }

  async gotoStore(): Promise<void> {
    await this.page.getByRole('link', { name: 'Store' }).click();
  }

  async gotoCart(): Promise<void> {
    await this.navCartLink().click();
  }

  async getCartCount(): Promise<number> {
    const visible = await this.navCartCount()
      .isVisible()
      .catch(() => false);
    if (!visible) return 0;

    const text = await this.navCartCount().innerText();
    const value = Number.parseInt(text, 10);
    return Number.isNaN(value) ? 0 : value;
  }

  async openNotifications(): Promise<void> {
    await this.navBellTrigger().click();
    await this.page.locator('#notifDropdown.show').waitFor({ state: 'visible' });
  }

  async markAllNotificationsRead(): Promise<void> {
    await this.openNotifications();
    await this.page.locator('#markNotificationsRead').click();
  }

  async openAccountMenu(): Promise<void> {
    await this.navProfileTrigger().click();
    await this.page.locator('#userDropdown.show').waitFor({ state: 'visible' });
  }

  async logout(): Promise<void> {
    await this.openAccountMenu();
    await this.navLogoutLink().click();
  }

  async openQaToolsMenu(): Promise<void> {
    await this.page.locator('#devMenuContainer .dropdown-trigger').click();
    await this.page.locator('#devDropdown.show').waitFor({ state: 'visible' });
  }

  async gotoQaGuide(): Promise<void> {
    await this.openQaToolsMenu();
    await this.page.getByRole('link', { name: 'QA Guide' }).click();
  }

  async gotoApiDocs(): Promise<void> {
    await this.openQaToolsMenu();
    await this.page.getByRole('link', { name: 'API Docs' }).click();
  }

  async gotoChaosLab(): Promise<void> {
    await this.openQaToolsMenu();
    await this.page.getByRole('link', { name: 'Chaos Lab' }).click();
  }

  async isLoggedIn(): Promise<boolean> {
    return await this.navAccountMenu()
      .isVisible()
      .catch(() => false);
  }
}
