import { test, expect, loginAndSyncSession, seedCart } from '@fixtures';
import { seededProducts } from '@data';

test.describe('stripe ui @e2e @checkout', () => {
  test.use({ seedData: true });

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
    await seedCart(api, [{ id: seededProducts[0].id }]);
  });

  test('stripe element loads in live mode @e2e @checkout @smoke', async ({ cartPage, checkoutPage }) => {
    await cartPage.goto();
    await cartPage.proceedToCheckout();

    if (await checkoutPage.isMockPayment()) {
      test.skip('Mock payment mode enabled; skipping live Stripe checks');
    }

    await checkoutPage.waitForStripeReady();
    const status = await checkoutPage.getSubmitStatus();
    expect(status).not.toBeNull();
  });
});
