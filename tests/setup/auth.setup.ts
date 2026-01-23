import { test, expect, Page } from '@playwright/test';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const authDir = path.resolve(process.cwd(), 'playwright', '.auth');
const adminStatePath = path.join(authDir, 'admin.json');
const userStatePath = path.join(authDir, 'user.json');

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function loginAndSaveState(page: Page, username: string, password: string, statePath: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-username').fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();

  await expect(page.getByTestId('nav-account-menu')).toBeVisible({ timeout: 15000 });

  fs.mkdirSync(authDir, { recursive: true });
  await page.context().storageState({ path: statePath });
}

test('authenticate as admin', async ({ page }) => {
  const username = requireEnv('ADMIN_USERNAME');
  const password = requireEnv('ADMIN_PASSWORD');

  await loginAndSaveState(page, username, password, adminStatePath);
});

test('authenticate as user', async ({ page }) => {
  const username = requireEnv('USER_USERNAME');
  const password = requireEnv('USER_PASSWORD');

  await loginAndSaveState(page, username, password, userStatePath);
});
