import { APIRequestContext, request } from '@playwright/test';
import { env } from '@config/constants';

// Create a reusable API request context (cookies/session are handled automatically).
export const createApiContext = async (): Promise<APIRequestContext> => {
  return await request.newContext({
    // Backend base URL.
    baseURL: env.baseUrl
  });
};

// Helper to read a JSON response body.
export const readJson = async <T = unknown>(res: { json: () => Promise<T> }) => {
  return await res.json();
};
