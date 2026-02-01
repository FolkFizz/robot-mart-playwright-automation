import { APIRequestContext, expect } from "@playwright/test";
import {env} from '@config/env';
import {routes} from '@config/routes';

// ยิง /api/test/reset (ต้องใช้ TEST_API_KEY)
export const resetDb = async (ctx: APIRequestContext) => {
    const res = await ctx.post(routes.api.testReset, { // ยิงไปที่ endpoint เพื่อล้างข้อมูล
        headers: {
            // แนบกุญแจผ่านด่าน (Test API Key)
            'test-api-key': env.testApiKey
        }
    });

    // assert เบื้องต้นว่าต้อง ok (200-299)
    expect(res.ok()).toBeTruthy();
    return res;
};

// ยิง /api/test/seed (reset + seed)
export const seedDb = async (ctx: APIRequestContext) => {
    const res = await ctx.post(routes.api.testSeed, {
        headers: {
            'test-api-key': env.testApiKey
        }
    });
    expect(res.ok()).toBeTruthy();
    return res;
}