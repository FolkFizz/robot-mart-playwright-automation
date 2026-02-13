import { type APIRequestContext, type Page } from '@playwright/test';
import { createApiContext } from '@api/http';
import { loginAsUser, loginAsAdmin } from '@api/auth.api';
import { addToCart, clearCart } from '@api/cart.api';
import { runA11y, expectNoA11yViolations } from '@utils/a11y';

export type ApiTestFixtures = {
  api: APIRequestContext;
  loginUser: () => Promise<void>;
  loginAdmin: () => Promise<void>;
  runA11y: typeof runA11y;
  expectNoA11yViolations: typeof expectNoA11yViolations;
};

export const apiTestFixtures = {
  api: async (
    _: unknown,
    use: (context: APIRequestContext) => Promise<void>
  ) => {
    const ctx = await createApiContext();
    await use(ctx);
    await ctx.dispose();
  },
  loginUser: async (
    { api }: { api: APIRequestContext },
    use: (login: () => Promise<void>) => Promise<void>
  ) => {
    await use(async () => {
      await loginAsUser(api);
    });
  },
  loginAdmin: async (
    { api }: { api: APIRequestContext },
    use: (login: () => Promise<void>) => Promise<void>
  ) => {
    await use(async () => {
      await loginAsAdmin(api);
    });
  },
  runA11y: async (
    _: unknown,
    use: (runner: typeof runA11y) => Promise<void>
  ) => {
    await use(runA11y);
  },
  expectNoA11yViolations: async (
    _: unknown,
    use: (runner: typeof expectNoA11yViolations) => Promise<void>
  ) => {
    await use(expectNoA11yViolations);
  }
};

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
