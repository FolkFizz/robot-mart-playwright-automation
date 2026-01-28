import { Page } from '@playwright/test';

/**
 * A helper class for chaos engineering tests.
 * These methods simulate adverse conditions to test application resilience.
 */
export class ChaosHelper {
  /**
   * Enables Chaos Mode by appending a query parameter to the URL and reloading the page.
   * This is useful for activating feature flags or backend configurations that introduce chaotic behavior.
   * @param page - The Playwright Page object.
   */
  static async enableChaosMode(page: Page): Promise<void> {
    const currentUrl = page.url();
    const chaosParam = 'chaos=true';
    
    let newUrl: string;
    if (currentUrl.includes('?')) {
      newUrl = `${currentUrl}&${chaosParam}`;
    } else {
      newUrl = `${currentUrl}?${chaosParam}`;
    }
    
    await page.goto(newUrl);
  }

  /**
   * Simulates network latency by intercepting all network requests and delaying them.
   * @param page - The Playwright Page object.
   * @param latencyMs - The delay in milliseconds to add to each network request.
   */
  static async simulateNetworkLatency(page: Page, latencyMs: number): Promise<void> {
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, latencyMs));
      await route.continue();
    });
  }

  /**
   * Simulates a complete network outage by setting the browser context to offline.
   * @param page - The Playwright Page object.
   */
  static async simulateOfflineMode(page: Page): Promise<void> {
    await page.context().setOffline(true);
  }
}