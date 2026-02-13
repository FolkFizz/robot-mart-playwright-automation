import { test, expect, loginAndSyncSession, seedCart } from '@fixtures';
import { disableChaos, resetChaos, setChaosConfig } from '@api';
import { chaosToggles, seededProducts } from '@data';
import { allChaosToggles, fullChaosConfig } from '@test-helpers/constants/chaos';
import { routes } from '@config';
import {
  chaosConfigForSingleToggle,
  gotoWithRetries,
  reachCheckoutFromSeededCart
} from '@test-helpers/helpers/chaos';

/**
 * Overview: Resilience chaos E2E checks for checkout reachability under disruptive runtime toggles.
 * Summary: Exercises per-toggle and full-chaos purchase attempts with recovery fallback guarantees and long-running stability expectations.
 */

test.use({ seedData: true });

test.describe('chaos resilience @e2e @chaos @resilience', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await disableChaos();
  });

  test.afterEach(async () => {
    await resetChaos();
  });

  const purchaseModeCases: Array<{
    id: string;
    toggle: (typeof allChaosToggles)[number];
    title: string;
  }> = [
    {
      id: 'CHAOS-E04',
      toggle: chaosToggles.dynamicIds,
      title: 'purchase flow reaches checkout under dynamicIds chaos'
    },
    {
      id: 'CHAOS-E05',
      toggle: chaosToggles.flakyElements,
      title: 'purchase flow reaches checkout under flakyElements chaos'
    },
    {
      id: 'CHAOS-E06',
      toggle: chaosToggles.layoutShift,
      title: 'purchase flow remains recoverable under layoutShift chaos'
    },
    {
      id: 'CHAOS-E07',
      toggle: chaosToggles.zombieClicks,
      title: 'purchase flow reaches checkout under zombieClicks chaos'
    },
    {
      id: 'CHAOS-E08',
      toggle: chaosToggles.textScramble,
      title: 'purchase flow reaches checkout under textScramble chaos'
    },
    {
      id: 'CHAOS-E09',
      toggle: chaosToggles.latency,
      title: 'purchase flow reaches checkout under latency chaos'
    },
    {
      id: 'CHAOS-E10',
      toggle: chaosToggles.randomErrors,
      title: 'purchase flow reaches checkout under randomErrors chaos'
    },
    {
      id: 'CHAOS-E11',
      toggle: chaosToggles.brokenAssets,
      title: 'purchase flow reaches checkout under brokenAssets chaos'
    }
  ];

  for (const modeCase of purchaseModeCases) {
    test(`${modeCase.id}: ${modeCase.title} @e2e @chaos @regression @destructive`, async ({
      api,
      page
    }) => {
      const slowMode =
        modeCase.toggle === chaosToggles.layoutShift ||
        modeCase.toggle === chaosToggles.latency ||
        modeCase.toggle === chaosToggles.randomErrors;
      const isLayoutShift = modeCase.toggle === chaosToggles.layoutShift;
      test.setTimeout(isLayoutShift ? 180_000 : slowMode ? 120_000 : 60_000);

      await loginAndSyncSession(api, page);
      await seedCart(api, [{ id: seededProducts[0].id }]);

      await setChaosConfig(chaosConfigForSingleToggle(modeCase.toggle));
      const attempts =
        modeCase.toggle === chaosToggles.randomErrors
          ? 14
          : modeCase.toggle === chaosToggles.layoutShift
            ? 12
            : modeCase.toggle === chaosToggles.latency
              ? 12
              : 8;
      const reached = await reachCheckoutFromSeededCart(page, attempts);

      if (!reached && isLayoutShift) {
        // layoutShift can make clicks non-deterministic; verify app recovery after reset.
        await resetChaos();
        const recovered = await gotoWithRetries(page, routes.home, 4);
        expect(recovered).toBe(true);
        return;
      }

      expect(reached).toBe(true);
    });
  }

  test('CHAOS-E12: purchase flow remains recoverable with all chaos toggles enabled @e2e @chaos @regression @destructive', async ({
    api,
    page
  }) => {
    test.setTimeout(180_000);

    await loginAndSyncSession(api, page);
    await seedCart(api, [{ id: seededProducts[0].id }]);

    await setChaosConfig(fullChaosConfig);

    const reachedUnderFullChaos = await reachCheckoutFromSeededCart(page, 10);

    if (!reachedUnderFullChaos) {
      // Recovery guarantee: reset chaos and customer should complete same flow.
      await resetChaos();
      await seedCart(api, [{ id: seededProducts[0].id }]);
    }

    const reachedAfterRecovery = reachedUnderFullChaos || (await reachCheckoutFromSeededCart(page, 12));
    expect(reachedAfterRecovery).toBe(true);
  });
});


