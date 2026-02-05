import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';
import { createApiContext } from '@api/http';
import { resetDb } from '@api/test-hooks.api';
import { loginAsUser, loginAsAdmin } from '@api/auth.api';
import { addToCart, clearCart } from '@api/cart.api';
import { runA11y, expectNoA11yViolations } from '@utils/a11y-runner';

type TestFixtures = {
  api: APIRequestContext;
  loginUser: () => Promise<void>;
  loginAdmin: () => Promise<void>;
  runA11y: typeof runA11y;
  expectNoA11yViolations: typeof expectNoA11yViolations;
};

type WorkerFixtures = {
  seedData: boolean;
  _seed: void;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  seedData: [false, { option: true }],
  _seed: [
    async ({ seedData }, use) => {
      if (seedData) {
        const api = await createApiContext();
        try {
          const stockAll = process.env.SEED_STOCK ? Number(process.env.SEED_STOCK) : undefined;
          await resetDb(api, { stockAll });
        } finally {
          await api.dispose();
        }
      }
      await use();
    },
    { scope: 'worker', auto: true }
  ],
  api: async ({}, use) => {
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
  runA11y: async ({}, use) => {
    await use(runA11y);
  },
  expectNoA11yViolations: async ({}, use) => {
    await use(expectNoA11yViolations);
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

export const resetAndSeed = async (stockAll?: number) => {
  const api = await createApiContext();
  try {
    await resetDb(api, { stockAll });
  } finally {
    await api.dispose();
  }
};
