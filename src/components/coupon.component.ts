import { Page, Locator } from '@playwright/test';
import { testIdCart } from '@selectors/testids';

// Component สำหรับการใช้/ลบคูปองในตะกร้า
export class CouponComponent {
  private readonly page: Page;
  private readonly input: Locator;
  private readonly applyButton: Locator;
  private readonly removeButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.input = page.getByTestId(testIdCart.couponInput);
    this.applyButton = page.getByTestId(testIdCart.applyCoupon);
    this.removeButton = page.getByTestId(testIdCart.removeCoupon);
  }

  // ใส่โค้ดคูปองและกดใช้
  async apply(code: string): Promise<void> {
    await this.input.fill(code);
    await this.applyButton.click();

    // ถ้าคูปองสำเร็จ ปุ่ม remove จะโผล่ (ถ้าไม่สำเร็จให้ไปเช็ค toast/alert ใน test)
    await this.removeButton.waitFor({ state: 'visible', timeout: 3000 }).catch(async () => {
      await this.page.waitForLoadState('networkidle');
    });
  }

  // ลบคูปอง
  async remove(): Promise<void> {
    const visible = await this.removeButton.isVisible().catch(() => false);
    if (!visible) return;

    await this.removeButton.click();
    await this.applyButton.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  }

  // ตรวจว่ามีคูปองถูกใช้อยู่หรือไม่
  async isApplied(): Promise<boolean> {
    return await this.removeButton.isVisible().catch(() => false);
  }
}
