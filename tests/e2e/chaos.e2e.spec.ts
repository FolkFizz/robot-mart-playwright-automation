import { test, expect } from '@fixtures';
import { disableChaos, resetChaos } from '@api';
import { chaosStatusText, chaosToggles } from '@data';

test.describe('chaos lab @e2e @chaos', () => {
  test.beforeAll(async () => {
    await disableChaos();
  });

  test.afterEach(async () => {
    await resetChaos();
  });

  test('toggle layout shift activates chaos mode @e2e @chaos @regression', async ({ page, chaosPage }) => {
    await chaosPage.goto();

    await chaosPage.setToggle(chaosToggles.layoutShift, true);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      chaosPage.applyChanges()
    ]);

    const status = await chaosPage.getStatusText();
    expect(status).toBe(chaosStatusText.active);
  });
});
