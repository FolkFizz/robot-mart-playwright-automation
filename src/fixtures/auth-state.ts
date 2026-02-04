import fs from 'fs';
import path from 'path';
import { chromium, type Page } from 'playwright';
import { env } from '@config/env';
import { LoginPage } from '@pages/auth/login.page';

const authDir = path.join(process.cwd(), 'playwright', '.auth');

export const authStatePaths = {
  user: path.join(authDir, 'user.json'),
  admin: path.join(authDir, 'admin.json')
};

const ensureAuthDir = () => {
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
};

const loginAndSave = async (page: Page, username: string, password: string, outputPath: string) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(username, password);
  await page.context().storageState({ path: outputPath });
};

export const generateAuthStates = async () => {
  ensureAuthDir();

  const browser = await chromium.launch();
  const userContext = await browser.newContext({ baseURL: env.baseUrl });
  const userPage = await userContext.newPage();
  await loginAndSave(userPage, env.user.username, env.user.password, authStatePaths.user);
  await userContext.close();

  const adminContext = await browser.newContext({ baseURL: env.baseUrl });
  const adminPage = await adminContext.newPage();
  await loginAndSave(adminPage, env.admin.username, env.admin.password, authStatePaths.admin);
  await adminContext.close();

  await browser.close();
};

// ใช้เป็น globalSetup ได้ถ้าต้องการ
export default generateAuthStates;
