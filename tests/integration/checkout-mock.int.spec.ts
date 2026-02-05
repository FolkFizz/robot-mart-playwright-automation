import { test, expect, loginAndSyncSession, seedCart } from '@fixtures/base.fixture';

import { CartPage } from '@pages/cart.page';
import { CheckoutPage } from '@pages/checkout.page';
import { seededProducts } from '@data/products';

test.describe('checkout integration @integration @checkout', () => {
  test.use({ seedData: true });

  const firstProduct = seededProducts[0];
  const secondProduct = seededProducts[1];

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
    await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);
  });

  test('checkout total matches cart total @integration @checkout @regression', async ({ page }) => {
    const cart = new CartPage(page);
    const checkout = new CheckoutPage(page);

    await cart.goto();
    const cartTotal = await cart.getGrandTotalValue();

    await cart.proceedToCheckout();
    await checkout.waitForDomReady();

    if (!(await checkout.isMockPayment())) {
      await checkout.waitForStripeReady();
    }

    const checkoutTotal = CheckoutPage.parsePrice(await checkout.getTotal());
    expect(checkoutTotal).toBeCloseTo(cartTotal, 2);
  });
});
