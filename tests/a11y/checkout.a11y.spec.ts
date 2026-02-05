import { test, loginAndSyncSession, seedCart } from '@fixtures/base.fixture';

import { CartPage } from '@pages/cart.page';
import { CheckoutPage } from '@pages/checkout.page';
import { seededProducts } from '@data/catalog';

test.describe('checkout a11y @a11y @checkout', () => {
  test.use({ seedData: true });

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
    await seedCart(api, [{ id: seededProducts[0].id }]);
  });

  test('checkout page has no critical violations @a11y @checkout @destructive', async ({ page, runA11y, expectNoA11yViolations }) => {
    const cart = new CartPage(page);
    const checkout = new CheckoutPage(page);

    await cart.goto();
    await cart.proceedToCheckout();
    await checkout.waitForDomReady();

    if (!(await checkout.isMockPayment())) {
      await checkout.waitForStripeReady();
    }

    const results = await runA11y(page);
    expectNoA11yViolations(results);
  });
});
