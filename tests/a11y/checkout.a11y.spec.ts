import { test, loginAndSyncSession, seedCart } from '@fixtures';
import { seededProducts } from '@data';

test.describe('checkout a11y @a11y @checkout', () => {
  test.use({ seedData: true });

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
    await seedCart(api, [{ id: seededProducts[0].id }]);
  });

  test('checkout page has no critical violations @a11y @checkout @destructive', async ({ page, cartPage, checkoutPage, runA11y, expectNoA11yViolations }) => {
    await cartPage.goto();
    await cartPage.proceedToCheckout();
    await checkoutPage.waitForDomReady();

    if (!(await checkoutPage.isMockPayment())) {
      await checkoutPage.waitForStripeReady();
    }

    const results = await runA11y(page);
    expectNoA11yViolations(results);
  });
});
