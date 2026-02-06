import { test, loginAndSyncSession, seedCart } from '@fixtures';
import { seededProducts } from '@data';

test.describe('cart a11y @a11y @cart', () => {
  test.use({ seedData: true });

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
    await seedCart(api, [{ id: seededProducts[0].id }]);
  });

  test('cart page has no critical violations @a11y @cart @destructive', async ({ page, cartPage, runA11y, expectNoA11yViolations }) => {
    await cartPage.goto();

    const results = await runA11y(page);
    expectNoA11yViolations(results);
  });
});
