import { APIRequestContext, expect } from '@playwright/test';
import { env, routes } from '@config/constants';

// Call the safe stock reset API (requires X-RESET-KEY).
export const resetStockSafe = async (ctx: APIRequestContext) => {
  const res = await ctx.post(routes.api.resetStockSafe, {
    headers: {
      'X-RESET-KEY': env.resetKey
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
