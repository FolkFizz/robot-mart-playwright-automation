import { test as base } from './base.fixture';
import { createApiContext } from '@api/http';
import { resetDb, seedDb } from '@api/test-hooks.api';

// fixture สำหรับเตรียมข้อมูล (reset + seed) ให้ deterministic
type WorkerFixtures = {
  seedData: boolean;
};

export const test = base.extend<{}, WorkerFixtures>({
  seedData: [
    async ({}, use) => {
      const api = await createApiContext();
      try {
        await resetDb(api);
        await seedDb(api);
        await use(true);
      } finally {
        await api.dispose();
      }
    },
    { scope: 'worker' }
  ]
});

export { expect } from './base.fixture';
