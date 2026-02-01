import { APIRequestContext, expect } from "@playwright/test";
import {env} from '@config/env';
import { routes } from "@config/routes";

export const loginAsUser = async (ctx: APIRequestContext) => {
    const res = await ctx.post(routes.login, {
        form: {
            username: env.user.username,
            password: env.user.password
        }
    });

    // ถ้า login สำเร็จจะ redirect (302)
    expect(res.status()).toBe(302);
    return res;
};

export const loginAsAdmin = async (ctx: APIRequestContext) => {
    const res = await ctx.post(routes.login, {
        form: {
            username: env.admin.username,
            password: env.admin.password
        }
    });
    expect(res.status()).toBe(302);
    return res;
};
