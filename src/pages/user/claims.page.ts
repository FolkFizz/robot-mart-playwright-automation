import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base.page';
import { routes } from '@config/constants';

// Page object model for File Claim page (/claim).
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

  // Open claim page.
  async goto(): Promise<void> {
    await super.goto(routes.claim);
  }

  // Submit a claim form.
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
