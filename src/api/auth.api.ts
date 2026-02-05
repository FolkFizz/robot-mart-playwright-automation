import { APIRequestContext, expect } from "@playwright/test";
import {env} from '@config/env';
import { routes } from "@config/routes";

export const loginAsUser = async (ctx: APIRequestContext) => {
    const res = await ctx.post(routes.login, {
        form: {
            username: env.user.username,
            password: env.user.password
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    // ถ้า login สำเร็จจะ redirect (302)
    const status = res.status();
    expect([200, 302, 303]).toContain(status);
    return res;
};

export const loginAsAdmin = async (ctx: APIRequestContext) => {
    const res = await ctx.post(routes.login, {
        form: {
            username: env.admin.username,
            password: env.admin.password
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const status = res.status();
    expect([200, 302, 303]).toContain(status);
    return res;
};
