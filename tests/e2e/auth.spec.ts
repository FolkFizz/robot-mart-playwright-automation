import { test, expect, type Page } from '@playwright/test';

test.slow();
test.use({ storageState: { cookies: [], origins: [] } });

type NewUser = {
  username: string;
  email: string;
  password: string;
};

const buildUser = (): NewUser => {
  const stamp = Date.now();
  const rand = Math.floor(Math.random() * 10000);
  return {
    username: `user_${stamp}_${rand}`,
    email: `test_${stamp}_${rand}@robotmart.local`,
    password: `Robot#${rand}123`,
  };
};

const registerUser = async (page: Page, user: NewUser): Promise<void> => {
  await page.goto('/register', { waitUntil: 'domcontentloaded' });

  await page.getByTestId('register-username').fill(user.username);
  await page.getByTestId('register-email').fill(user.email);
  await page.getByTestId('register-password').fill(user.password);
  await page.getByTestId('register-confirm-password').fill(user.password);

  await Promise.all([
    page.waitForURL(/\/(login)?(\?|$)/, { timeout: 15000 }),
    page.getByTestId('register-submit').click(),
  ]);
};

test('User registration', async ({ page }) => {
  const user = buildUser();

  await registerUser(page, user);

  await expect(page).toHaveURL(/\/(login)?(\?|$)/, { timeout: 15000 });
});

test('Login with new user', async ({ page }) => {
  const user = buildUser();

  await registerUser(page, user);

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-username').fill(user.username);
  await page.getByTestId('login-password').fill(user.password);

  await Promise.all([
    page.waitForURL(/\/(\?|$)/, { timeout: 15000 }),
    page.getByTestId('login-submit').click(),
  ]);

  const profileIcon = page.getByTestId('nav-profile');
  await expect(profileIcon).toBeVisible({ timeout: 15000 });
});
