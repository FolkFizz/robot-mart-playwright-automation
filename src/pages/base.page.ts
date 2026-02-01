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
}
