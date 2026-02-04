import { Page, Locator } from '@playwright/test';

// Component สำหรับแถบเมนูด้านบน
export class NavbarComponent {
  private readonly page: Page;
  private readonly cartLink: Locator;
  private readonly cartCount: Locator;
  private readonly bellTrigger: Locator;
  private readonly accountMenu: Locator;
  private readonly profileTrigger: Locator;
  private readonly logoutLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cartLink = page.getByTestId('nav-cart-link');
    this.cartCount = page.getByTestId('nav-cart-count');
    this.bellTrigger = page.getByTestId('nav-bell');
    this.accountMenu = page.getByTestId('nav-account-menu');
    this.profileTrigger = page.getByTestId('nav-profile');
    this.logoutLink = page.getByTestId('logout-link');
  }

  // ไปหน้า Store (หน้าแรก)
  async gotoStore(): Promise<void> {
    await this.page.getByRole('link', { name: 'Store' }).click();
  }

  // ไปหน้า Cart
  async gotoCart(): Promise<void> {
    await this.cartLink.click();
  }

  // อ่านจำนวนสินค้าใน badge (ถ้าไม่เจอให้คืน 0)
  async getCartCount(): Promise<number> {
    const visible = await this.cartCount.isVisible().catch(() => false);
    if (!visible) return 0;

    const text = await this.cartCount.innerText();
    const value = Number.parseInt(text, 10);
    return Number.isNaN(value) ? 0 : value;
  }

  // เปิดเมนู Notifications
  async openNotifications(): Promise<void> {
    await this.bellTrigger.click();
    await this.page.locator('#notifDropdown.show').waitFor({ state: 'visible' });
  }

  // กด Mark all read ในเมนู notifications
  async markAllNotificationsRead(): Promise<void> {
    await this.openNotifications();
    await this.page.locator('#markNotificationsRead').click();
  }

  // เปิดเมนู Account
  async openAccountMenu(): Promise<void> {
    await this.profileTrigger.click();
    await this.page.locator('#userDropdown.show').waitFor({ state: 'visible' });
  }

  // ออกจากระบบ
  async logout(): Promise<void> {
    await this.openAccountMenu();
    await this.logoutLink.click();
  }

  // เปิดเมนู QA Tools
  async openQaToolsMenu(): Promise<void> {
    await this.page.locator('#devMenuContainer .dropdown-trigger').click();
    await this.page.locator('#devDropdown.show').waitFor({ state: 'visible' });
  }

  // ไปหน้า QA Guide
  async gotoQaGuide(): Promise<void> {
    await this.openQaToolsMenu();
    await this.page.getByRole('link', { name: 'QA Guide' }).click();
  }

  // ไปหน้า API Docs (เปิดแท็บใหม่)
  async gotoApiDocs(): Promise<void> {
    await this.openQaToolsMenu();
    await this.page.getByRole('link', { name: 'API Docs' }).click();
  }

  // ไปหน้า Chaos Lab
  async gotoChaosLab(): Promise<void> {
    await this.openQaToolsMenu();
    await this.page.getByRole('link', { name: 'Chaos Lab' }).click();
  }

  // เช็คว่าล็อกอินอยู่หรือไม่จากเมนู account
  async isLoggedIn(): Promise<boolean> {
    return await this.accountMenu.isVisible().catch(() => false);
  }
}
