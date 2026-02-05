import { APIRequestContext, APIResponse } from '@playwright/test';
import { createApiContext } from '@api/http';
import { env, routes } from '@config/constants';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

type SeedOptions = {
  // กำหนด stock ให้ทุกสินค้าหลัง seed (เช่น 100 สำหรับ load test)
  stockAll?: number;
};

type ResetOptions = SeedOptions & {
  // true = factory reset (reset + seed), false = reset อย่างเดียว
  factoryReset?: boolean;
};

const resolveStockAll = (stockAll?: number) => {
  if (typeof stockAll === 'number' && !Number.isNaN(stockAll)) return stockAll;

  const envValue = process.env.SEED_STOCK;
  if (envValue !== undefined && envValue !== '') {
    const parsed = Number(envValue);
    if (!Number.isNaN(parsed)) return parsed;
  }

  // Default rich stock for stability in large test runs
  return 100;
};

const resolveInitSqlPath = () => {
  const customPath = process.env.INIT_SQL_PATH;
  if (customPath) return path.resolve(customPath);
  return path.resolve(process.cwd(), '..', 'robot-store-sandbox', 'database', 'init.sql');
};

const resolveSsl = () => {
  try {
    const url = new URL(env.databaseUrl);
    const isLocal =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '::1';
    const sslMode = url.searchParams.get('sslmode');
    if (!isLocal || sslMode === 'require') {
      return { rejectUnauthorized: false };
    }
  } catch {
    // ignore invalid URL, fall back to no ssl
  }
  return undefined;
};

const seedFromInitSql = async (stockAll?: number) => {
  const filePath = resolveInitSqlPath();
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `[test-hooks] init.sql not found: ${filePath}. Set INIT_SQL_PATH if your web repo is in a different location.`
    );
  }

  const sql = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
  const client = new Client({
    connectionString: env.databaseUrl,
    ssl: resolveSsl()
  });
  await client.connect();
  try {
    await client.query(sql);
    const resolvedStock = resolveStockAll(stockAll);
    await client.query('UPDATE products SET stock = $1', [resolvedStock]);
  } finally {
    await client.end();
  }
};

const isProdBaseUrl = (value: string) => {
  try {
    const { hostname } = new URL(value);
    return hostname === 'robot-store-sandbox.onrender.com';
  } catch {
    return value.includes('robot-store-sandbox.onrender.com');
  }
};

// ยิง /api/test/reset หรือ /api/test/seed (factory reset)
export const resetDb = async (_ctx: APIRequestContext, options: ResetOptions = {}) => {
  if (isProdBaseUrl(env.baseUrl)) {
    // ป้องกันการลบข้อมูลจริงเมื่อยิงไป Production
    console.warn(`[test-hooks] Skip reset/seed on production baseUrl: ${env.baseUrl}`);
    return null;
  }

  const factoryReset = options.factoryReset ?? true;
  if (!factoryReset) {
    console.warn('[test-hooks] factoryReset=false ถูก ignore เพื่อความ deterministic');
  }

  await seedFromInitSql(options.stockAll);
  return null;
};

// ยิง /api/test/seed (reset + seed) และรองรับการปรับ stock หลัง seed
export const seedDb = async (_ctx: APIRequestContext, options: SeedOptions = {}) => {
  if (isProdBaseUrl(env.baseUrl)) {
    // ป้องกันการ seed เมื่อยิงไป Production
    console.warn(`[test-hooks] Skip seed on production baseUrl: ${env.baseUrl}`);
    return null;
  }

  await seedFromInitSql(options.stockAll);
  return null;
};

export type ChaosConfig = {
  dynamicIds?: boolean;
  flakyElements?: boolean;
  layoutShift?: boolean;
  zombieClicks?: boolean;
  textScramble?: boolean;
  latency?: boolean;
  randomErrors?: boolean;
  brokenAssets?: boolean;
  enabled?: boolean;
  disableAll?: boolean;
  reset?: boolean;
};

export const defaultChaosConfig: Required<Omit<ChaosConfig, 'enabled' | 'disableAll' | 'reset'>> = {
  dynamicIds: false,
  flakyElements: false,
  layoutShift: false,
  zombieClicks: false,
  textScramble: false,
  latency: false,
  randomErrors: false,
  brokenAssets: false
};

export const setChaosConfig = async (config: ChaosConfig = {}): Promise<APIResponse> => {
  const api = await createApiContext();
  try {
    const payload = { ...defaultChaosConfig, ...config };
    return await api.post(routes.api.chaosConfig, { data: payload });
  } finally {
    await api.dispose();
  }
};

export const enableChaos = async (config: ChaosConfig = {}) => {
  return await setChaosConfig({ ...config, enabled: true });
};

export const disableChaos = async () => {
  return await setChaosConfig({ disableAll: true, enabled: false, reset: true });
};

export const resetChaos = async () => {
  return await setChaosConfig({ reset: true, disableAll: true, enabled: false });
};
