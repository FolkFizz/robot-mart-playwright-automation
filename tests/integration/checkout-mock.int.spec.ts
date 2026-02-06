import { test, expect, loginAndSyncSession, seedCart } from '@fixtures';
import { seededProducts } from '@data';

test.describe('checkout integration @integration @checkout', () => {
  test.use({ seedData: true });

  const firstProduct = seededProducts[0];
  const secondProduct = seededProducts[1];

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
    await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);
  });

  test('checkout total matches cart total @integration @checkout @regression', async ({ cartPage, checkoutPage }) => {
    await cartPage.goto();
    const cartTotal = await cartPage.getGrandTotalValue();

    await cartPage.proceedToCheckout();
    await checkoutPage.waitForDomReady();

    if (!(await checkoutPage.isMockPayment())) {
      await checkoutPage.waitForStripeReady();
    }

    const checkoutTotal = checkoutPage.constructor.parsePrice(await checkoutPage.getTotal());
    expect(checkoutTotal).toBeCloseTo(cartTotal, 2);
  });
});
