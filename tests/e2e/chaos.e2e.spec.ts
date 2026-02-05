import { test, expect } from '@fixtures/base.fixture';

import { ChaosPage } from '@pages/chaos.page';
import { disableChaos, resetChaos } from '@fixtures/chaos';
import { chaosStatusText, chaosToggles } from '@data/chaos';

test.describe('chaos lab @e2e @chaos', () => {
  test.beforeAll(async () => {
    await disableChaos();
  });

  test.afterEach(async () => {
    await resetChaos();
  });

  test('toggle layout shift activates chaos mode @e2e @chaos @regression', async ({ page }) => {
    const chaos = new ChaosPage(page);
    await chaos.goto();

    await chaos.setToggle(chaosToggles.layoutShift, true);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      chaos.applyChanges()
    ]);

    const status = await chaos.getStatusText();
    expect(status).toBe(chaosStatusText.active);
  });
});
