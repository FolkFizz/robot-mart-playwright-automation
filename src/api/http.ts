import { APIRequestContext, request } from '@playwright/test';
import { env } from '@config/constants';

const parseTimeoutMs = (): number => {
  const raw = process.env.API_REQUEST_TIMEOUT_MS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return process.env.CI ? 30_000 : 15_000;
};

// Create a reusable API request context (cookies/session are handled automatically).
export const createApiContext = async (): Promise<APIRequestContext> => {
  return await request.newContext({
    // Backend base URL.
    baseURL: env.baseUrl,
    timeout: parseTimeoutMs()
  });
};

// Helper to read a JSON response body.
export const readJson = async <T = unknown>(res: { json: () => Promise<T> }) => {
  return await res.json();
};
