import { createApiContext } from '@api/http';
import { resetDb } from '@api/test-hooks.api';

// reset + seed database สำหรับเทส (ใช้ TEST_API_KEY)
export const resetAndSeed = async () => {
  const api = await createApiContext();
  try {
    const stockAll = process.env.SEED_STOCK ? Number(process.env.SEED_STOCK) : undefined;
    await resetDb(api, { stockAll });
  } finally {
    await api.dispose();
  }
};

// ใช้เป็น global setup ได้ถ้าต้องการ
const globalSetup = async () => {
  const shouldSeed = process.env.SEED_DATA !== 'false';
  if (!shouldSeed) return;
  await resetAndSeed();
};

export default globalSetup;
