import { test, loginAndSyncSession, seedCart } from '@fixtures/base.fixture';

import { CartPage } from '@pages/cart.page';
import { seededProducts } from '@data/catalog';

test.describe('cart a11y @a11y @cart', () => {
  test.use({ seedData: true });

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
    await seedCart(api, [{ id: seededProducts[0].id }]);
  });

  test('cart page has no critical violations @a11y @cart @destructive', async ({ page, runA11y, expectNoA11yViolations }) => {
    const cart = new CartPage(page);
    await cart.goto();

    const results = await runA11y(page);
    expectNoA11yViolations(results);
  });
});
