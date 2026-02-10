import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';
import { createApiContext } from '@api/http';
import { resetDb } from '@api/test-hooks.api';
import { loginAsUser, loginAsAdmin } from '@api/auth.api';
import { addToCart, clearCart } from '@api/cart.api';
import { runA11y, expectNoA11yViolations } from '@utils/a11y';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Import all Page Objects
import {
  HomePage,
  ProductPage,
  CartPage,
  CheckoutPage,
  ChatWidgetPage,
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  ChaosPage,
  ProfilePage,
  ClaimsPage,
  InboxPage,
  NotificationsPage,
  AdminDashboardPage,
  AdminClaimsPage,
  AdminCouponsPage,
  AdminInventoryPage,
  AdminOrdersPage
} from '@pages';

const seedRunId = process.env.PW_RUN_ID ?? 'local';
const seedLockDir = path.join(os.tmpdir(), 'robot-store-playwright-seed');
const seedDoneFile = path.join(seedLockDir, `${seedRunId}.done`);
const seedLockFile = path.join(seedLockDir, `${seedRunId}.lock`);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const seedOncePerRun = async (runSeed: () => Promise<void>): Promise<void> => {
  fs.mkdirSync(seedLockDir, { recursive: true });
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    if (fs.existsSync(seedDoneFile)) return;

    try {
      const lockFd = fs.openSync(seedLockFile, 'wx');
      try {
        if (!fs.existsSync(seedDoneFile)) {
          await runSeed();
          fs.writeFileSync(seedDoneFile, String(Date.now()));
        }
      } finally {
        fs.closeSync(lockFd);
        if (fs.existsSync(seedLockFile)) {
          fs.unlinkSync(seedLockFile);
        }
      }
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') throw error;
      await delay(250);
    }
  }

  throw new Error(`[fixtures] Timed out waiting for seed lock: ${seedLockFile}`);
};

type TestFixtures = {
  api: APIRequestContext;
  loginUser: () => Promise<void>;
  loginAdmin: () => Promise<void>;
  runA11y: typeof runA11y;
  expectNoA11yViolations: typeof expectNoA11yViolations;
  // Main Page Objects
  homePage: HomePage;
  productPage: ProductPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  chatWidgetPage: ChatWidgetPage;
  chaosPage: ChaosPage;
  // Auth Page Objects
  loginPage: LoginPage;
  registerPage: RegisterPage;
  forgotPasswordPage: ForgotPasswordPage;
  resetPasswordPage: ResetPasswordPage;
  // User Page Objects
  profilePage: ProfilePage;
  claimsPage: ClaimsPage;
  inboxPage: InboxPage;
  notificationsPage: NotificationsPage;
  // Admin Page Objects
  adminDashboardPage: AdminDashboardPage;
  adminClaimsPage: AdminClaimsPage;
  adminCouponsPage: AdminCouponsPage;
  adminInventoryPage: AdminInventoryPage;
  adminOrdersPage: AdminOrdersPage;
};

type WorkerFixtures = {
  seedData: boolean;
  _seed: void;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  seedData: [false, { scope: 'worker', option: true }],
  _seed: [
    async ({ seedData }, use) => {
      if (seedData) {
        await seedOncePerRun(async () => {
          const api = await createApiContext();
          try {
            const stockAll = process.env.SEED_STOCK ? Number(process.env.SEED_STOCK) : undefined;
            await resetDb(api, { stockAll });
          } finally {
            await api.dispose();
          }
        });
      }
      await use();
    },
    { scope: 'worker', auto: true }
  ],
  api: async (_args, use) => {
    const ctx = await createApiContext();
    await use(ctx);
    await ctx.dispose();
  },
  loginUser: async ({ api }, use) => {
    await use(async () => {
      await loginAsUser(api);
    });
  },
  loginAdmin: async ({ api }, use) => {
    await use(async () => {
      await loginAsAdmin(api);
    });
  },
  runA11y: async (_args, use) => {
    await use(runA11y);
  },
  expectNoA11yViolations: async (_args, use) => {
    await use(expectNoA11yViolations);
  },
  // Main Page Objects
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  chatWidgetPage: async ({ page }, use) => {
    await use(new ChatWidgetPage(page));
  },
  chaosPage: async ({ page }, use) => {
    await use(new ChaosPage(page));
  },
  // Auth Page Objects
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  forgotPasswordPage: async ({ page }, use) => {
    await use(new ForgotPasswordPage(page));
  },
  resetPasswordPage: async ({ page }, use) => {
    await use(new ResetPasswordPage(page));
  },
  // User Page Objects
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },
  claimsPage: async ({ page }, use) => {
    await use(new ClaimsPage(page));
  },
  inboxPage: async ({ page }, use) => {
    await use(new InboxPage(page));
  },
  notificationsPage: async ({ page }, use) => {
    await use(new NotificationsPage(page));
  },
  // Admin Page Objects
  adminDashboardPage: async ({ page }, use) => {
    await use(new AdminDashboardPage(page));
  },
  adminClaimsPage: async ({ page }, use) => {
    await use(new AdminClaimsPage(page));
  },
  adminCouponsPage: async ({ page }, use) => {
    await use(new AdminCouponsPage(page));
  },
  adminInventoryPage: async ({ page }, use) => {
    await use(new AdminInventoryPage(page));
  },
  adminOrdersPage: async ({ page }, use) => {
    await use(new AdminOrdersPage(page));
  }
});

export { expect };

export const loginAndSyncSession = async (api: APIRequestContext, page: Page) => {
  await loginAsUser(api);
  const storage = await api.storageState();
  await page.context().addCookies(storage.cookies);
};

export const seedCart = async (
  api: APIRequestContext,
  items: Array<{ id: number; quantity?: number }>
) => {
  await clearCart(api);
  for (const item of items) {
    await addToCart(api, item.id, item.quantity ?? 1);
  }
};
