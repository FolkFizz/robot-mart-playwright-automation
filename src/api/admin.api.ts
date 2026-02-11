import { APIRequestContext, expect } from '@playwright/test';
import { env, routes } from '@config/constants';

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveStockAll = (): number => {
  return parsePositiveInt(
    process.env.SEED_STOCK,
    parsePositiveInt(process.env.PERF_STOCK_ALL, 300)
  );
};

// Call the safe stock reset API (requires X-RESET-KEY).
export const resetStockSafe = async (ctx: APIRequestContext) => {
  const res = await ctx.post(routes.api.resetStockSafe, {
    headers: {
      'X-RESET-KEY': env.resetKey
    },
    data: {
      stockAll: resolveStockAll()
    }
  });

  expect(res.ok()).toBeTruthy();
  return res;
};

// Fetch admin notifications (useful for validation checks).
export const listAdminNotifications = async (ctx: APIRequestContext) => {
  const res = await ctx.get(routes.api.adminNotifications, {
    headers: { Accept: 'application/json' }
  });
  expect(res.ok()).toBeTruthy();
  return res;
};
