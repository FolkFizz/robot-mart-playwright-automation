import { Page, Locator } from '@playwright/test';

// BasePage: Class แม่ของทุก Page Object

export class BasePage {
    protected readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    // ใช้สำหรับเปิด path ใดๆ พร้อมรอให้ DOM โหลด
    async goto(path: string): Promise<void> {
        await this.page.goto(path, {waitUntil: 'domcontentloaded'});
    }

    // helper สำหรับหา element ด้วย data-testid
    getByTestId(id: string): Locator {
        return this.page.getByTestId(id);
    }

    // helper สำหรับหา element ด้วย selector ปกติ
    locator(selector: string): Locator {
        return this.page.locator(selector);
    }

    // คลิก element โดยใช้ data-testid
    async clickByTestId(id: string): Promise<void> {
        await this.getByTestId(id).click();
    }

    // พิมพ์ค่าใน input โดยใช้ data-testid
    async fillByTestId(id: string, value: string): Promise<void> {
        await this.getByTestId(id).fill(value);
    }

    // อ่านข้อความจาก element โดยใช้ data-testid
    async textByTestId(id: string): Promise<string> {
        return await this.getByTestId(id).innerText();
    }

    // รอจนโหลดหน้า DOM เสร็จ
    async waitForDomReady(): Promise<void> {
        await this.page.waitForLoadState('domcontentloaded');
    }

    // รอจน network ว่าง (กรณีหน้าข้อมูลโหลดเยอะ)
    async waitForNetworkIdle(): Promise<void> {
        await this.page.waitForLoadState('networkidle');
    }

    // รอ Toast (default: รอให้โผล่)
    async waitForToast(options: {
        testId?: string;
        selector?: string;
        state?: 'visible' | 'hidden' | 'attached' | 'detached';
        timeout?: number;
    } = {}): Promise<void> {
        const {
            testId,
            // UI จริงใน sandbox ใช้กล่องแจ้งเตือนเป็น .alert / .alert-success / .alert-error
            selector = '.alert, .alert-success, .alert-error',
            state = 'visible',
            timeout = 5000
        } = options;

        const target = testId ? this.getByTestId(testId): this.page.locator(selector);
        await target.first().waitFor({state, timeout});    
    }

    // รอ Spinner (default: รอให้หายไป)
    async waitForSpinner(options: {
        testId?: string;
        selector?: string;
        state?: 'visible' | 'hidden' | 'attached' | 'detached';
        timeout?: number;
    } = {}): Promise<void> {
        const {
        testId,
        // UI จริงใน sandbox ใช้ spinner เป็น #spinner และมี class .spinner
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
        const visible = await this.navCartCount().isVisible().catch(() => false);
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
        return await this.navAccountMenu().isVisible().catch(() => false);
    }
}
