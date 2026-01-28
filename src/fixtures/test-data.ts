import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/auth/login.page';

type MyFixtures = {
  loginPage: LoginPage;
  authedPage: LoginPage;
};

export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  authedPage: async ({ loginPage }, use) => {
    // Ideally, we create a user via API here.
    // For now, we will use a hardcoded user or just the mechanism.
    // Since we don't know a valid user yet, we will just Navigate to login for now in this sample,
    // or assume 'User' / 'Pass' which will fail but demonstrates the fixture.
    await loginPage.goto();
    await loginPage.loginAs('testuser', 'password123');
    await use(loginPage);
  },
});

export { expect } from '@playwright/test';
