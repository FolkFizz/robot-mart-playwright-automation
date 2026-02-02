import { test as base } from './base.fixture';
import { createApiContext } from '@api/http';
import { resetDb } from '@api/test-hooks.api';

// fixture สำหรับเตรียมข้อมูล (reset + seed) ให้ deterministic
type WorkerFixtures = {
  seedData: boolean;
};

export const test = base.extend<{}, WorkerFixtures>({
  seedData: [
    async ({}, use) => {
      const api = await createApiContext();
      try {
        const stockAll = process.env.SEED_STOCK ? Number(process.env.SEED_STOCK) : undefined;
        await resetDb(api, { stockAll });
        await use(true);
      } finally {
        await api.dispose();
      }
    },
    { scope: 'worker', auto: true }
  ]
});

export { expect } from './base.fixture';
