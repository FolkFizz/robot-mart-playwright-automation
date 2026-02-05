import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { routes } from '@config/constants';

export type ChaosToggle =
  | 'dynamicIds'
  | 'flakyElements'
  | 'layoutShift'
  | 'zombieClicks'
  | 'textScramble'
  | 'latency'
  | 'randomErrors'
  | 'brokenAssets';

export class ChaosPage extends BasePage {
  private readonly widget: Locator;
  private readonly header: Locator;
  private readonly saveButton: Locator;
  private readonly resetButton: Locator;
  private readonly statusText: Locator;

  constructor(page: Page) {
    super(page);
    this.widget = this.getByTestId('chaos-widget');
    this.header = this.widget.locator('.chaos-header');
    this.saveButton = this.getByTestId('save-chaos-btn');
    this.resetButton = this.widget.locator('.btn-reset');
    this.statusText = this.widget.locator('.status-text');
  }

  async goto(): Promise<void> {
    await super.goto(routes.chaosLab);
  }

  async isWidgetOpen(): Promise<boolean> {
    const className = await this.widget.getAttribute('class');
    return !(className || '').includes('closed');
  }

  async openWidget(): Promise<void> {
    if (await this.isWidgetOpen()) return;
    await this.header.click();
  }

  async closeWidget(): Promise<void> {
    if (!(await this.isWidgetOpen())) return;
    await this.header.click();
  }

  async setToggle(name: ChaosToggle, enabled: boolean): Promise<void> {
    await this.openWidget();
    const checkbox = this.widget.locator(`input[name="${name}"]`);
    await checkbox.setChecked(enabled);
  }

  async applyChanges(): Promise<void> {
    await this.saveButton.click();
  }

  async resetAll(): Promise<void> {
    await this.openWidget();
    await this.resetButton.click();
  }

  async getStatusText(): Promise<string> {
    return await this.statusText.innerText();
  }
}
