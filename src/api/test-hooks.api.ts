import { APIRequestContext, APIResponse } from '@playwright/test';
import { createApiContext } from '@api/http';
import { env, routes } from '@config/constants';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

type SeedOptions = {
  // à¸à¸³à¸«à¸™à¸” stock à¹ƒà¸«à¹‰à¸—à¸¸à¸à¸ªà¸´à¸™à¸„à¹‰à¸²à¸«à¸¥à¸±à¸‡ seed (à¹€à¸Šà¹ˆà¸™ 100 à¸ªà¸³à¸«à¸£à¸±à¸š load test)
  stockAll?: number;
};

type ResetOptions = SeedOptions;

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

const resolveInitSqlPath = (): { filePath: string; checked: string[] } => {
  const customPath = process.env.INIT_SQL_PATH;
  if (customPath) {
    const filePath = path.resolve(customPath);
    return { filePath, checked: [filePath] };
  }

  const checked = [
    path.resolve(process.cwd(), 'database', 'init.sql'),
    path.resolve(process.cwd(), '..', 'robot-store-sandbox', 'database', 'init.sql')
  ];

  const filePath = checked.find((candidate) => fs.existsSync(candidate)) ?? checked[0];
  return { filePath, checked };
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
  const { filePath, checked } = resolveInitSqlPath();
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `[test-hooks] init.sql not found. Checked: ${checked.join(', ')}. Set INIT_SQL_PATH to your web repo path.`
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

// à¸¢à¸´à¸‡ /api/test/reset à¸«à¸£à¸·à¸­ /api/test/seed (factory reset)
export const resetDb = async (_ctx: APIRequestContext, options: ResetOptions = {}) => {
  if (isProdBaseUrl(env.baseUrl)) {
    // à¸›à¹‰à¸­à¸‡à¸à¸±à¸™à¸à¸²à¸£à¸¥à¸šà¸‚à¹‰à¸­à¸¡à¸¹à¸¥à¸ˆà¸£à¸´à¸‡à¹€à¸¡à¸·à¹ˆà¸­à¸¢à¸´à¸‡à¹„à¸› Production
    console.warn(`[test-hooks] Skip reset/seed on production baseUrl: ${env.baseUrl}`);
    return null;
  }

  await seedFromInitSql(options.stockAll);
  return null;
};

// à¸¢à¸´à¸‡ /api/test/seed (reset + seed) à¹à¸¥à¸°à¸£à¸­à¸‡à¸£à¸±à¸šà¸à¸²à¸£à¸›à¸£à¸±à¸š stock à¸«à¸¥à¸±à¸‡ seed
export const seedDb = async (_ctx: APIRequestContext, options: SeedOptions = {}) => {
  if (isProdBaseUrl(env.baseUrl)) {
    // à¸›à¹‰à¸­à¸‡à¸à¸±à¸™à¸à¸²à¸£ seed à¹€à¸¡à¸·à¹ˆà¸­à¸¢à¸´à¸‡à¹„à¸› Production
    console.warn(`[test-hooks] Skip seed on production baseUrl: ${env.baseUrl}`);
    return null;
  }

  await seedFromInitSql(options.stockAll);
  return null;
};

export const setProductStock = async (ctx: APIRequestContext, productId: number, stock: number): Promise<APIResponse> => {
  return await ctx.post(routes.api.testSetStock, {
    data: { productId, stock },
    headers: { Accept: 'application/json' },
    maxRedirects: 0
  });
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

