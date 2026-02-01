import {test as base, expect} from '@playwright/test';
import { createApiContext } from '@api/http';

// fixture พื้นฐาน: มี api context + expect
export const test = base.extend<{
    api: Awaited<ReturnType<typeof createApiContext>>;
}>({
    api: async({}, use) => {
        const ctx = await createApiContext();
        await use(ctx);
        await ctx.dispose();
    }
 });

 export{expect};