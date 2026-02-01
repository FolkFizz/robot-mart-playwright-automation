import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';

// POM สำหรับหน้า File Claim (/claim)
export class ClaimsPage extends BasePage {
  private readonly invoiceInput: Locator;
  private readonly descriptionInput: Locator;
  private readonly fileInput: Locator;
  private readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.invoiceInput = this.page.locator('input[name="invoice_id"]');
    this.descriptionInput = this.page.locator('textarea[name="description"]');
    this.fileInput = this.page.locator('input[name="image"]');
    this.submitButton = this.page.locator('button[type="submit"]');
  }

  // เปิดหน้าเคลม (ไม่มีใน routes config จึงใช้ path ตรง)
  async goto(): Promise<void> {
    await super.goto('/claim');
  }

  // ส่งเคลม
  async submitClaim(invoiceId: string, description: string, filePath?: string): Promise<void> {
    await this.invoiceInput.fill(invoiceId);
    await this.descriptionInput.fill(description);
    if (filePath) {
      await this.fileInput.setInputFiles(filePath);
    }
    await this.submitButton.click();
    await this.waitForNetworkIdle();
  }
}
