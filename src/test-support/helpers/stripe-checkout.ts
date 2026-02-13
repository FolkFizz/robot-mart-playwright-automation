import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { routes } from '@config';
import type { CartPage } from '@pages';

export const expectOnCheckoutPath = async (page: Page) => {
  await expect(page).toHaveURL(
    (url) => url.pathname === routes.order.checkout || url.pathname === routes.order.place
  );
};

export const gotoCheckoutFromCart = async (page: Page, cartPage: CartPage) => {
  await cartPage.goto();
  await cartPage.proceedToCheckoutWithFallback();
  await expectOnCheckoutPath(page);
};
