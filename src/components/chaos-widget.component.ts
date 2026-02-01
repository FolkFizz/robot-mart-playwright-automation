import { Page, Locator } from '@playwright/test';
import { testIdChaos } from '@selectors/testids';

// ชื่อ toggle ทั้งหมดใน Chaos Widget
export type ChaosToggle =
  | 'dynamicIds'
  | 'flakyElements'
  | 'layoutShift'
  | 'zombieClicks'
  | 'textScramble'
  | 'latency'
  | 'randomErrors'
  | 'brokenAssets';

// Component สำหรับ Chaos Widget (มุมซ้ายล่าง)
export class ChaosWidgetComponent {
  private readonly page: Page;
  private readonly root: Locator;
  private readonly header: Locator;
  private readonly saveButton: Locator;
  private readonly resetButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.root = page.getByTestId(testIdChaos.widget);
    this.header = this.root.locator('.chaos-header');
    this.saveButton = page.getByTestId(testIdChaos.save);
    this.resetButton = this.root.locator('.btn-reset');
  }

  // เช็คว่าวิดเจ็ตเปิดอยู่หรือไม่
  async isOpen(): Promise<boolean> {
    const className = await this.root.getAttribute('class');
    return !(className || '').includes('closed');
  }

  // เปิดวิดเจ็ต (ถ้าปิดอยู่)
  async open(): Promise<void> {
    if (await this.isOpen()) return;
    await this.header.click();
  }

  // ปิดวิดเจ็ต (ถ้าเปิดอยู่)
  async close(): Promise<void> {
    if (!(await this.isOpen())) return;
    await this.header.click();
  }

  // ตั้งค่า toggle ตัวเดียว
  async setToggle(name: ChaosToggle, enabled: boolean): Promise<void> {
    await this.open();
    const checkbox = this.root.locator(`input[name="${name}"]`);
    await checkbox.setChecked(enabled);
  }

  // กดบันทึกการตั้งค่า
  async applyChanges(): Promise<void> {
    await this.saveButton.click();
  }

  // กด Reset (มี confirm dialog ให้จัดการใน test)
  async resetAll(): Promise<void> {
    await this.open();
    await this.resetButton.click();
  }

  // อ่านสถานะด้านบนของวิดเจ็ต (Normal System / Chaos Active)
  async getStatusText(): Promise<string> {
    return await this.root.locator('.status-text').innerText();
  }
}
