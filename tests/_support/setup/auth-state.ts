import fs from 'fs';
import path from 'path';
import { chromium, type Page } from 'playwright';
import { env } from '@config/env';
import { routes } from '@config/routes';
import { testIdAuth, testIdNav } from '@selectors/testids';

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
  const loginUrl = new URL(routes.login, env.baseUrl).toString();
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
  await page.getByTestId(testIdAuth.loginUsername).fill(username);
  await page.getByTestId(testIdAuth.loginPassword).fill(password);
  await page.getByTestId(testIdAuth.loginSubmit).click();
  await page.getByTestId(testIdNav.accountMenu).waitFor({ state: 'visible', timeout: 15000 });
  await page.context().storageState({ path: outputPath });
};

export const generateAuthStates = async () => {
  ensureAuthDir();

  const browser = await chromium.launch();
  const userContext = await browser.newContext();
  const userPage = await userContext.newPage();
  await loginAndSave(userPage, env.user.username, env.user.password, authStatePaths.user);
  await userContext.close();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await loginAndSave(adminPage, env.admin.username, env.admin.password, authStatePaths.admin);
  await adminContext.close();

  await browser.close();
};

// ใช้เป็น globalSetup ได้ถ้าต้องการ
export default generateAuthStates;
