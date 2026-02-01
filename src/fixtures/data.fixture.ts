import { test as base } from './base.fixture';
import { resetDb, seedDb } from '@api/test-hooks.api';

// fixture สำหรับเตรียมข้อมูล (reset + seed) ให้ deterministic
export const test = base.extend<{
  seedData: boolean;
}>({
  seedData: [
    async ({ api }, use) => {
      await resetDb(api);
      await seedDb(api);
      await use(true);
    },
    { scope: 'worker' }
  ]
});

export { expect } from './base.fixture';
