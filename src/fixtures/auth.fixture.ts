import {test as base} from './base.fixture';
import { loginAsUser, loginAsAdmin } from '@api/auth.api';

type AuthFixtures = {
loginUser: boolean;
loginAdmin: boolean;
};

// fixture สำหรับ login ผ่าน API (session-based)
export const test = base.extend<AuthFixtures>({
    // ให้ spec ที่ต้องการเรียก login ก่อน
    loginUser: async({api}, use) => {
        await loginAsUser(api);
        await use(true);
    },
    loginAdmin: async({api}, use) => {
        await loginAsAdmin(api);
        await use(true);
    }
});

export {expect} from './base.fixture';