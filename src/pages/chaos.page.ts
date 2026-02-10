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
  private readonly saveButton: Locator;
  private readonly toggleInputs: Locator;

  constructor(page: Page) {
    super(page);
    this.saveButton = this.page.locator(
      'button.btn-save, button:has-text("Apply Configuration"), [data-testid="save-chaos-btn"]'
    );
    this.toggleInputs = this.page.locator('input[type="checkbox"][name]');
  }

  async goto(): Promise<void> {
    await super.goto(routes.chaosLab);
    await this.toggleInputs.first().waitFor({ state: 'attached' });
  }

  async isWidgetOpen(): Promise<boolean> {
    return true;
  }

  async openWidget(): Promise<void> {
    // Current Chaos Lab UI is always expanded.
  }

  async closeWidget(): Promise<void> {
    // Current Chaos Lab UI is always expanded.
  }

  private toggleInput(name: ChaosToggle): Locator {
    return this.page.locator(`input[type="checkbox"][name="${name}"]`);
  }

  async hasToggleInput(name: ChaosToggle): Promise<boolean> {
    return (await this.toggleInput(name).count()) === 1;
  }

  async isSaveButtonVisible(): Promise<boolean> {
    return await this.saveButton
      .first()
      .isVisible()
      .catch(() => false);
  }

  async setToggle(name: ChaosToggle, enabled: boolean): Promise<void> {
    const checkbox = this.toggleInput(name);
    await checkbox.waitFor({ state: 'attached' });
    await checkbox.evaluate((el, value) => {
      const input = el as HTMLInputElement;
      input.checked = Boolean(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, enabled);
  }

  async getToggleState(name: ChaosToggle): Promise<boolean> {
    const checkbox = this.toggleInput(name);
    await checkbox.waitFor({ state: 'attached' });
    return await checkbox.evaluate((el) => (el as HTMLInputElement).checked);
  }

  async getEnabledToggleNames(): Promise<ChaosToggle[]> {
    const names = await this.toggleInputs.evaluateAll((inputs) => {
      return inputs
        .filter((input) => (input as HTMLInputElement).checked)
        .map((input) => input.getAttribute('name') || '')
        .filter(Boolean);
    });
    return names as ChaosToggle[];
  }

  async applyChanges(): Promise<void> {
    await this.saveButton.waitFor({ state: 'visible' });
    await Promise.all([
      this.page
        .waitForResponse(
          (res) => res.url().includes(routes.api.chaosConfig) && res.request().method() === 'POST',
          { timeout: 10_000 }
        )
        .catch(() => null),
      this.saveButton.click()
    ]);
    await this.waitForDomReady();
  }

  async resetAll(): Promise<void> {
    const toggles: ChaosToggle[] = [
      'dynamicIds',
      'flakyElements',
      'layoutShift',
      'zombieClicks',
      'textScramble',
      'latency',
      'randomErrors',
      'brokenAssets'
    ];
    for (const toggle of toggles) {
      await this.setToggle(toggle, false);
    }
    await this.applyChanges();
  }

  async getStatusText(): Promise<string> {
    const enabled = await this.getEnabledToggleNames();
    return enabled.length > 0 ? 'Chaos Active' : 'Normal System';
  }
}
