import { test, expect, loginAndSyncSession, seedCart } from '@fixtures/base.fixture';

import { CartPage } from '@pages/cart.page';
import { CheckoutPage } from '@pages/checkout.page';
import { seededProducts } from '@data/catalog';

test.describe('stripe ui @e2e @checkout', () => {
  test.use({ seedData: true });

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
    await seedCart(api, [{ id: seededProducts[0].id }]);
  });

  test('stripe element loads in live mode @e2e @checkout @smoke', async ({ page }) => {
    const cart = new CartPage(page);
    const checkout = new CheckoutPage(page);

    await cart.goto();
    await cart.proceedToCheckout();

    if (await checkout.isMockPayment()) {
      test.skip('Mock payment mode enabled; skipping live Stripe checks');
    }

    await checkout.waitForStripeReady();
    const status = await checkout.getSubmitStatus();
    expect(status).not.toBeNull();
  });
});
