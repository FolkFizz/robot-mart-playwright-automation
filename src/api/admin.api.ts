import { APIRequestContext, expect } from '@playwright/test';
import { env } from '@config/env';
import { routes } from '@config/routes';

// เรียก API รีเซ็ต stock แบบปลอดภัย (ต้องมี X-RESET-KEY)
export const resetStockSafe = async (ctx: APIRequestContext) => {
  const res = await ctx.post(routes.api.resetStockSafe, {
    headers: {
      'X-RESET-KEY': env.resetKey
    }
  });

  expect(res.ok()).toBeTruthy();
  return res;
};

// ดึงรายการแจ้งเตือนของแอดมิน (ถ้าอยากใช้เช็คข้อมูล)
export const listAdminNotifications = async (ctx: APIRequestContext) => {
  const res = await ctx.get(routes.api.adminNotifications, {
    headers: { Accept: 'application/json' }
  });
  expect(res.ok()).toBeTruthy();
  return res;
};
