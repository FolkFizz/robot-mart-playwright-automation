import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { routes } from '@config';
import { emptyCartTextPatterns } from '@test-helpers/constants/checkout';
import { CheckoutPage } from '@pages';
import type { CartPage } from '@pages';

export const isCheckoutPath = (url: string): boolean => {
  return url.includes(routes.order.checkout) || url.includes(routes.order.place);
};

export const expectOnCheckoutPath = async (page: Page) => {
  await expect(page).toHaveURL(
    (url) => url.pathname === routes.order.checkout || url.pathname === routes.order.place
  );
};

export const gotoCheckoutFromCart = async (
  page: Page,
  cartPage: CartPage,
  checkoutPage?: CheckoutPage
): Promise<void> => {
  await cartPage.goto();
  await cartPage.proceedToCheckoutWithFallback();

  if (checkoutPage && !isCheckoutPath(page.url())) {
    await checkoutPage.goto();
  }

  await expectOnCheckoutPath(page);
};

export const waitForCheckoutReady = async (
  checkoutPage: CheckoutPage
): Promise<'mock' | 'stripe'> => {
  await checkoutPage.waitForDomReady();
  await checkoutPage.expectSubmitVisible();

  if (await checkoutPage.isMockPayment()) return 'mock';

  if ((await checkoutPage.getStripeFrameCount()) > 0) {
    expect(await checkoutPage.isStripeFrameVisible()).toBe(true);
    return 'stripe';
  }

  await checkoutPage.expectPaymentElementVisible();
  return 'stripe';
};

export const hasEmptyCartGuard = async (checkoutPage: CheckoutPage): Promise<boolean> => {
  return await checkoutPage.hasEmptyCartGuard(emptyCartTextPatterns);
};

export const expectCheckoutTotalCloseTo = async (
  checkoutPage: CheckoutPage,
  expected: number,
  precision = 2
) => {
  const checkoutTotal = CheckoutPage.parsePrice(await checkoutPage.getTotal());
  expect(checkoutTotal).toBeCloseTo(expected, precision);
};
