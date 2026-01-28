import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/auth/login.page';
import { RegisterPage } from '../pages/auth/register.page';
import { ProductListPage } from '../pages/shopping/product-list.page';
import { CartPage } from '../pages/shopping/cart.page';

type MyFixtures = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  productListPage: ProductListPage;
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

  productListPage: async ({ page }, use) => {
    const productListPage = new ProductListPage(page);
    await use(productListPage);
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
    await page.waitForURL(/\/(profile|$)/);
    
    await use(loginPage);
  },
});

export { expect };
