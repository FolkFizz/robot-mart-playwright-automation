import { test, expect } from '@fixtures';
import { disableChaos, resetChaos, setChaosConfig } from '@api';
import { chaosStatusText, chaosToggles, seededProducts } from '@data';
import { allChaosToggles, fullChaosConfig } from '@test-helpers/constants/chaos';
import { routes } from '@config';
import { gotoWithRetries } from '@test-helpers/helpers/chaos';

/**
 * Overview: Deterministic chaos-lab E2E checks for toggle controls, bounded degradation, and reset behavior.
 * Summary: Focuses on predictable chaos config effects, API latency/error behavior, and reliable cleanup back to normal state.
 */

test.use({ seedData: true });

test.describe('chaos comprehensive @e2e @chaos', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await disableChaos();
  });

  test.afterEach(async () => {
    await resetChaos();
  });

  test.describe('positive cases', () => {
    test('CHAOS-P01: chaos lab renders all toggle controls @e2e @chaos @smoke', async ({
      chaosPage
    }) => {
      await chaosPage.goto();

      for (const toggle of allChaosToggles) {
        expect(await chaosPage.hasToggleInput(toggle)).toBe(true);
      }
      expect(await chaosPage.isSaveButtonVisible()).toBe(true);
      expect(await chaosPage.getStatusText()).toBe(chaosStatusText.normal);
    });

    test('CHAOS-P02: enabling layout-shift via UI persists after reload @e2e @chaos @regression', async ({
      chaosPage
    }) => {
      await chaosPage.goto();
      await chaosPage.setToggle(chaosToggles.layoutShift, true);
      await chaosPage.applyChanges();

      await chaosPage.reloadDomReady();
      expect(await chaosPage.getToggleState(chaosToggles.layoutShift)).toBe(true);
      expect(await chaosPage.getStatusText()).toBe(chaosStatusText.active);
    });

    test('CHAOS-P03: latency chaos slows product API but stays available @e2e @chaos @regression', async ({
      api
    }) => {
      await setChaosConfig({ latency: true });

      const t1 = Date.now();
      const r1 = await api.get(routes.api.products);
      const d1 = Date.now() - t1;

      const t2 = Date.now();
      const r2 = await api.get(routes.api.products);
      const d2 = Date.now() - t2;

      expect(r1.status()).toBe(200);
      expect(r2.status()).toBe(200);
      expect(Math.max(d1, d2)).toBeGreaterThanOrEqual(1200);
    });

    test('CHAOS-P04: customer can still browse product page under latency+layout shift @e2e @chaos @regression', async ({
      page,
      homePage,
      productPage
    }) => {
      await setChaosConfig({ latency: true, layoutShift: true });

      await homePage.goto();
      expect(await homePage.hasProducts()).toBe(true);

      await homePage.clickProductById(seededProducts[0].id);
      expect(page.url()).toContain(routes.productDetail(seededProducts[0].id));
      expect(await productPage.getTitle()).toContain(seededProducts[0].name);
    });
  });

  test.describe('negative cases', () => {
    test('CHAOS-N01: random 500 chaos causes intermittent failures, not total outage @e2e @chaos @regression', async ({
      api
    }) => {
      await setChaosConfig({ randomErrors: true });

      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < 30; i++) {
        const res = await api.get(routes.api.products, { maxRedirects: 0 });
        if (res.status() >= 500) failureCount += 1;
        if (res.status() === 200) successCount += 1;
      }

      expect(failureCount).toBeGreaterThan(0);
      expect(successCount).toBeGreaterThan(0);
    });

    test('CHAOS-N02: invalid chaos payload is ignored safely @e2e @chaos @regression', async ({
      api
    }) => {
      const res = await api.post(routes.api.chaosConfig, {
        data: { __invalidToggle__: true, enabled: false },
        maxRedirects: 0
      });

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('success');
      expect(body.config.enabled).toBe(false);
      expect(body.config.__invalidToggle__).toBeUndefined();
    });

    test('CHAOS-N03: reset clears all active chaos toggles @e2e @chaos @regression', async ({
      chaosPage
    }) => {
      await setChaosConfig({
        layoutShift: true,
        latency: true,
        randomErrors: true
      });

      await resetChaos();
      await chaosPage.goto();

      for (const toggle of allChaosToggles) {
        expect(await chaosPage.getToggleState(toggle)).toBe(false);
      }
      expect(await chaosPage.getStatusText()).toBe(chaosStatusText.normal);
    });
  });

  test.describe('edge cases', () => {
    test('CHAOS-E01: all chaos toggles together still allow recovery path @e2e @chaos @regression', async ({
      page,
      chaosPage
    }) => {
      await setChaosConfig(fullChaosConfig);

      const loaded = await gotoWithRetries(page, routes.home, 5);
      expect(loaded).toBe(true);

      const resetRes = await resetChaos();
      expect(resetRes.status()).toBe(200);

      await chaosPage.goto();
      expect(await chaosPage.getStatusText()).toBe(chaosStatusText.normal);
    });

    test('CHAOS-E02: rapid config updates follow last-write-wins behavior @e2e @chaos @regression', async ({
      chaosPage
    }) => {
      await setChaosConfig({ layoutShift: true, latency: true });
      await setChaosConfig({ layoutShift: false, latency: false, brokenAssets: true });

      await chaosPage.goto();
      expect(await chaosPage.getToggleState(chaosToggles.layoutShift)).toBe(false);
      expect(await chaosPage.getToggleState(chaosToggles.latency)).toBe(false);
      expect(await chaosPage.getToggleState(chaosToggles.brokenAssets)).toBe(true);
      expect(await chaosPage.getStatusText()).toBe(chaosStatusText.active);
    });

    test('CHAOS-E03: chaos control endpoint remains fast while app endpoint is delayed @e2e @chaos @regression', async ({
      api
    }) => {
      await setChaosConfig({ latency: true });

      const appStart = Date.now();
      const appRes = await api.get(routes.api.products);
      const appMs = Date.now() - appStart;

      const controlStart = Date.now();
      const controlRes = await api.post(routes.api.chaosConfig, {
        data: { layoutShift: true },
        maxRedirects: 0
      });
      const controlMs = Date.now() - controlStart;

      expect(appRes.status()).toBe(200);
      expect(controlRes.status()).toBe(200);
      expect(appMs).toBeGreaterThanOrEqual(1000);
      expect(controlMs).toBeLessThan(appMs);
    });

  });
});


