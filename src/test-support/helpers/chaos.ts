import type { Page } from '@playwright/test';
import { routes } from '@config';
import { chaosToggles } from '@data';
import { CartPage } from '@pages';
import { allChaosToggles, checkoutPaths } from '@test-helpers/constants/chaos';

const isCheckoutUrl = (url: string) =>
  url.includes(routes.order.checkout) || url.includes(routes.order.place);

export const gotoWithRetries = async (page: Page, url: string, attempts = 5): Promise<boolean> => {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded' });
      if (!res || res.status() < 500) return true;
    } catch {
      // ignore and retry
    }
  }
  return false;
};

export const waitForCheckoutUrl = async (page: Page, timeoutMs = 2_500): Promise<boolean> => {
  try {
    await page.waitForURL((url) => isCheckoutUrl(url.toString()), {
      timeout: timeoutMs,
      waitUntil: 'domcontentloaded'
    });
    return true;
  } catch {
    return isCheckoutUrl(page.url());
  }
};

export const chaosConfigForSingleToggle = (toggle: (typeof allChaosToggles)[number]) => ({
  dynamicIds: toggle === chaosToggles.dynamicIds,
  flakyElements: toggle === chaosToggles.flakyElements,
  layoutShift: toggle === chaosToggles.layoutShift,
  zombieClicks: toggle === chaosToggles.zombieClicks,
  textScramble: toggle === chaosToggles.textScramble,
  latency: toggle === chaosToggles.latency,
  randomErrors: toggle === chaosToggles.randomErrors,
  brokenAssets: toggle === chaosToggles.brokenAssets
});

export const reachCheckoutFromSeededCart = async (page: Page, attempts = 10): Promise<boolean> => {
  const cartPage = new CartPage(page);

  for (let i = 0; i < attempts; i += 1) {
    try {
      await cartPage.goto();
      const itemCount = await cartPage.getItemCount();
      if (itemCount < 1) {
        await page.waitForLoadState('networkidle', { timeout: 1_500 }).catch(() => undefined);
        continue;
      }

      await cartPage.proceedToCheckoutWithFallback().catch(() => null);
      if (await waitForCheckoutUrl(page, 3_000)) {
        return true;
      }
    } catch {
      await page.waitForLoadState('domcontentloaded', { timeout: 1_000 }).catch(() => undefined);
    }
  }

  // Recovery fallback: customer retries by opening checkout directly.
  for (const path of checkoutPaths) {
    for (let i = 0; i < 4; i += 1) {
      try {
        await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 15_000 });
        if (isCheckoutUrl(page.url())) {
          return true;
        }
      } catch {
        await page.waitForLoadState('domcontentloaded', { timeout: 1_000 }).catch(() => undefined);
      }
    }
  }

  return false;
};
