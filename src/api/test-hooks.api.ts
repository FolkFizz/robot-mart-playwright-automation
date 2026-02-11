import { APIRequestContext, APIResponse } from '@playwright/test';
import { createApiContext } from '@api/http';
import { env, routes } from '@config/constants';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

type SeedOptions = {
  // Override stock for all products after reset/seed.
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

const buildTestHookPayload = (stockAll?: number) => {
  const payload: Record<string, unknown> = {};
  if (stockAll !== undefined) {
    payload.stockAll = stockAll;
  }
  return payload;
};

const buildTestHookHeaders = () => ({
  Accept: 'application/json',
  // Support both legacy and current backend header names.
  'test-api-key': env.testApiKey,
  'X-TEST-API-KEY': env.testApiKey
});

const resolveInitSqlPath = (): { filePath: string; checked: string[] } => {
  const customPath = process.env.INIT_SQL_PATH;
  if (customPath) {
    const filePath = path.resolve(customPath);
    return { filePath, checked: [filePath] };
  }

  const checked = [path.resolve(process.cwd(), 'database', 'init.sql')];

  const filePath = checked.find((candidate) => fs.existsSync(candidate)) ?? checked[0];
  return { filePath, checked };
};

const resolveSsl = () => {
  try {
    const url = new URL(env.databaseUrl);
    const isLocal =
      url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1';
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
      `[test-hooks] init.sql not found. Checked: ${checked.join(', ')}. ` +
        `Provide database/init.sql in this repo or set INIT_SQL_PATH explicitly.`
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

const isLocalBaseUrl = (value: string) => {
  try {
    const { hostname } = new URL(value);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return value.includes('localhost') || value.includes('127.0.0.1');
  }
};

const toBool = (value: string | undefined, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase());
};

const shouldSkipDestructiveHooks = () => {
  if (toBool(process.env.ALLOW_DESTRUCTIVE_TEST_HOOKS, false)) return false;
  if (isProdBaseUrl(env.baseUrl)) return true;
  return !isLocalBaseUrl(env.baseUrl);
};

const shouldFallbackToSql = (status: number) => {
  return status === 404 || status === 405 || status === 501 || status >= 500;
};

const runResetOrSeed = async (
  ctx: APIRequestContext,
  action: 'reset' | 'seed',
  options: SeedOptions = {}
) => {
  const stockAll = resolveStockAll(options.stockAll);
  const route = action === 'reset' ? routes.api.testReset : routes.api.testSeed;
  const payload = buildTestHookPayload(stockAll);

  const res = await ctx.post(route, {
    data: payload,
    headers: buildTestHookHeaders(),
    maxRedirects: 0
  });

  if (res.ok()) {
    return null;
  }

  const status = res.status();
  if (shouldFallbackToSql(status)) {
    console.warn(
      `[test-hooks] ${route} returned ${status}. Falling back to local SQL seed strategy.`
    );
    await seedFromInitSql(stockAll);
    return null;
  }

  const bodyText = await res.text().catch(() => '');
  throw new Error(
    `[test-hooks] ${route} failed with status ${status}. ` +
      `Check TEST_API_KEY/RESET_KEY and backend hook permissions. Response: ${bodyText.slice(0, 500)}`
  );
};

// Reset test data using API hook first, then SQL fallback if hook is unavailable.
export const resetDb = async (ctx: APIRequestContext, options: ResetOptions = {}) => {
  if (shouldSkipDestructiveHooks()) {
    // Destructive hooks are allowed only for localhost targets unless explicitly overridden.
    console.warn(
      `[test-hooks] Skip destructive reset/seed on baseUrl: ${env.baseUrl}. ` +
        `Use localhost or set ALLOW_DESTRUCTIVE_TEST_HOOKS=true intentionally.`
    );
    return null;
  }

  await runResetOrSeed(ctx, 'reset', options);
  return null;
};

// Seed test data using API hook first, then SQL fallback if hook is unavailable.
export const seedDb = async (ctx: APIRequestContext, options: SeedOptions = {}) => {
  if (shouldSkipDestructiveHooks()) {
    // Destructive hooks are allowed only for localhost targets unless explicitly overridden.
    console.warn(
      `[test-hooks] Skip destructive seed on baseUrl: ${env.baseUrl}. ` +
        `Use localhost or set ALLOW_DESTRUCTIVE_TEST_HOOKS=true intentionally.`
    );
    return null;
  }

  await runResetOrSeed(ctx, 'seed', options);
  return null;
};

export const setProductStock = async (
  ctx: APIRequestContext,
  productId: number,
  stock: number
): Promise<APIResponse> => {
  return await ctx.post(routes.api.testSetStock, {
    data: { productId, stock },
    headers: buildTestHookHeaders(),
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
