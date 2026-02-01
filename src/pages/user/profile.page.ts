import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/routes';

// POM สำหรับหน้า Profile
export class ProfilePage extends BasePage {
  private readonly emailInput: Locator;
  private readonly phoneInput: Locator;
  private readonly addressInput: Locator;
  private readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = this.page.locator('input[name="email"]');
    this.phoneInput = this.page.locator('input[name="phone"]');
    this.addressInput = this.page.locator('textarea[name="address"]');
    this.saveButton = this.page.locator('button.btn-save');
  }

  // เปิดหน้า profile (tab info เป็นค่า default)
  async goto(): Promise<void> {
    await super.goto(routes.profile);
  }

  // เปิด tab เฉพาะ (info | orders | claims)
  async gotoTab(tab: 'info' | 'orders' | 'claims'): Promise<void> {
    await super.goto(`${routes.profile}?tab=${tab}`);
  }

  // อัปเดตข้อมูลโปรไฟล์
  async updateProfile(email?: string, phone?: string, address?: string): Promise<void> {
    if (email !== undefined) await this.emailInput.fill(email);
    if (phone !== undefined) await this.phoneInput.fill(phone);
    if (address !== undefined) await this.addressInput.fill(address);
    await this.saveButton.click();
    await this.waitForNetworkIdle();
  }

  // นับจำนวน order ในหน้า (ใช้ตรวจเบื้องต้น)
  async getOrderCount(): Promise<number> {
    return await this.page.locator('.order-card').count();
  }
}
