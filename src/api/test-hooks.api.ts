import { APIRequestContext, expect } from '@playwright/test';
import { env } from '@config/env';
import { routes } from '@config/routes';
import { loginAsAdmin } from '@api/auth.api';

type SeedOptions = {
  // กำหนด stock ให้ทุกสินค้าหลัง seed (เช่น 100 สำหรับ load test)
  stockAll?: number;
};

type ResetOptions = SeedOptions & {
  // true = factory reset (reset + seed), false = reset อย่างเดียว
  factoryReset?: boolean;
};

type ProductRow = {
  id: number;
  name: string;
  price: string | number;
  stock: number;
  category?: string;
  description?: string;
  serial_number?: string;
  is_buggy?: boolean;
};

const isProdBaseUrl = (value: string) => {
  try {
    const { hostname } = new URL(value);
    return hostname === 'robot-store-sandbox.onrender.com';
  } catch {
    return value.includes('robot-store-sandbox.onrender.com');
  }
};

const setAllProductStock = async (ctx: APIRequestContext, stockAll: number) => {
  // ถ้าเป็น 100 ใช้ endpoint reset-stock ได้เลย (ไม่ต้อง admin)
  if (stockAll === 100) {
    const res = await ctx.post(routes.api.resetStockSafe, {
      headers: {
        'x-reset-key': env.resetKey
      }
    });
    expect(res.ok()).toBeTruthy();
    return;
  }

  // กรณีต้องการค่าอื่น ๆ: ต้อง login admin แล้ว PATCH ทีละสินค้า
  await loginAsAdmin(ctx);

  const listRes = await ctx.get(routes.api.products, {
    headers: { Accept: 'application/json' }
  });
  expect(listRes.ok()).toBeTruthy();
  const body = await listRes.json();
  const products: ProductRow[] = body.products || [];

  for (const product of products) {
    const res = await ctx.patch(`/api/admin/products/${product.id}`, {
      data: {
        name: product.name,
        price: product.price,
        stock: stockAll,
        category: product.category ?? '',
        description: product.description ?? '',
        serial_number: product.serial_number ?? '',
        is_buggy: product.is_buggy ? 'on' : ''
      }
    });
    expect(res.ok()).toBeTruthy();
  }
};

// ยิง /api/test/reset หรือ /api/test/seed (factory reset)
export const resetDb = async (ctx: APIRequestContext, options: ResetOptions = {}) => {
  if (isProdBaseUrl(env.baseUrl)) {
    // ป้องกันการลบข้อมูลจริงเมื่อยิงไป Production
    console.warn(`[test-hooks] Skip reset/seed on production baseUrl: ${env.baseUrl}`);
    return null;
  }

  const factoryReset = options.factoryReset ?? true;

  if (factoryReset) {
    return await seedDb(ctx, { stockAll: options.stockAll });
  }

  const res = await ctx.post(routes.api.testReset, {
    headers: {
      'test-api-key': env.testApiKey
    }
  });
  expect(res.ok()).toBeTruthy();
  return res;
};

// ยิง /api/test/seed (reset + seed) และรองรับการปรับ stock หลัง seed
export const seedDb = async (ctx: APIRequestContext, options: SeedOptions = {}) => {
  if (isProdBaseUrl(env.baseUrl)) {
    // ป้องกันการ seed เมื่อยิงไป Production
    console.warn(`[test-hooks] Skip seed on production baseUrl: ${env.baseUrl}`);
    return null;
  }

  const res = await ctx.post(routes.api.testSeed, {
    headers: {
      'test-api-key': env.testApiKey
    }
  });
  expect(res.ok()).toBeTruthy();

  if (typeof options.stockAll === 'number') {
    await setAllProductStock(ctx, options.stockAll);
  }

  return res;
};
