import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/auth/login.page';
import { RegisterPage } from '../pages/auth/register.page';
import { CartPage } from '../pages/shopping/cart.page';

type MyFixtures = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
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

  cartPage: async ({ page }, use) => {
    const cartPage = new CartPage(page);
    await use(cartPage);
  },

  // Authenticated page fixture - logs in automatically
  authedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    
    // Use default test credentials
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
