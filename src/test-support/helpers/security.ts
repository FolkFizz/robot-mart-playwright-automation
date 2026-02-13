import type { APIRequestContext } from '@playwright/test';
import { env } from '@config';
import { expectNoServerError } from '@utils';
import type { HeaderMap } from '@test-helpers/types/security-contracts';

export const getHostname = (baseUrl: string): string => {
  try {
    return new URL(baseUrl).hostname.toLowerCase();
  } catch {
    return 'localhost';
  }
};

export const isLocalTarget = (): boolean => {
  const hostname = getHostname(env.baseUrl);
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
};

export const isStrictHeaderMode = (): boolean => {
  const value = process.env.STRICT_SECURITY_HEADERS?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
};

export const getHeaders = async (api: APIRequestContext, path: string): Promise<HeaderMap> => {
  const res = await api.get(path, { maxRedirects: 0 });
  expectNoServerError(res);
  return res.headers();
};
