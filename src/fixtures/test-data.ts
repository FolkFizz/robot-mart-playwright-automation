import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/auth/login.page';
import { RegisterPage } from '../pages/auth/register.page';
import { ProductListPage } from '../pages/shopping/product-list.page';
import { ProductDetailPage } from '../pages/shopping/product-detail.page';
import { CartPage } from '../pages/shopping/cart.page';
import { CheckoutPage } from '../pages/shopping/checkout.page';
import { OrderSuccessPage } from '../pages/shopping/order-success.page';

type TestFixtures = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  productListPage: ProductListPage;
  productDetailPage: ProductDetailPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  orderSuccessPage: OrderSuccessPage;
  authedPage: any;
};

export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },

  productListPage: async ({ page }, use) => {
    await use(new ProductListPage(page));
  },

  productDetailPage: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
  },

  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },

  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },

  orderSuccessPage: async ({ page }, use) => {
    await use(new OrderSuccessPage(page));
  },

  // Auto-login fixture for tests that require authentication
  authedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(
      process.env.USER_USERNAME || 'user',
      process.env.USER_PASSWORD || 'user123'
    );
    await page.getByTestId('nav-account-menu').waitFor({state: 'visible', timeout: 15000})
    await use(page);
  },
});

export { expect };

