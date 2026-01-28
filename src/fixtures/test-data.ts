import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/auth/login.page';
import { RegisterPage } from '../pages/auth/register.page';
import { CatalogPage } from '../pages/shop/catalog.page';
import { ProductDetailPage } from '../pages/shop/product-detail.page';
import { CartPage } from '../pages/shop/cart.page';

type MyFixtures = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  catalogPage: CatalogPage;
  productDetailPage: ProductDetailPage;
  cartPage: CartPage;
  authedPage: LoginPage;
};

export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  registerPage: async ({ page }, use) => {
    const registerPage = new RegisterPage(page);
    await use(registerPage);
  },

  catalogPage: async ({ page }, use) => {
    const catalogPage = new CatalogPage(page);
    await use(catalogPage);
  },

  productDetailPage: async ({ page }, use) => {
    const productDetailPage = new ProductDetailPage(page);
    await use(productDetailPage);
  },

  cartPage: async ({ page }, use) => {
    const cartPage = new CartPage(page);
    await use(cartPage);
  },

  // Authenticated page fixture - logs in automatically
  authedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    // Use default test credentials
    // TODO: Replace with API-based user creation
    const username = process.env.TEST_USERNAME || 'testuser';
    const password = process.env.TEST_PASSWORD || 'password123';
    
    await loginPage.login(username, password);
    
    // Wait for navigation after login
    await page.waitForURL(/\/(profile|$)/, { timeout: 10000 }).catch(() => {
      // If login fails, continue anyway for tests that handle it
    });
    
    await use(loginPage);
  },
});

export { expect };
