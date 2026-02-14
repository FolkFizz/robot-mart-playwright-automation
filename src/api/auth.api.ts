import { APIRequestContext, expect } from '@playwright/test';
import { env, routes } from '@config/constants';

const LOGIN_OK_STATUSES = [200, 302, 303];
const TRANSIENT_LOGIN_CODES = new Set(['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE']);
const TRANSIENT_LOGIN_MESSAGE = /socket hang up|connection reset|network/i;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isErrnoException = (error: unknown): error is NodeJS.ErrnoException => {
  return typeof error === 'object' && error !== null && 'code' in error;
};

const isTransientLoginError = (error: unknown): boolean => {
  if (isErrnoException(error) && error.code && TRANSIENT_LOGIN_CODES.has(error.code)) {
    return true;
  }

  if (error instanceof Error) {
    return TRANSIENT_LOGIN_MESSAGE.test(error.message);
  }

  return false;
};

const shouldRetryStatus = (status: number): boolean => status === 429 || status >= 500;

const postLoginWithRetry = async (
  ctx: APIRequestContext,
  credentials: { username: string; password: string }
) => {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await ctx.post(routes.login, {
        form: credentials,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const status = res.status();
      if (LOGIN_OK_STATUSES.includes(status)) {
        return res;
      }

      if (attempt < maxAttempts && shouldRetryStatus(status)) {
        await delay(250 * attempt);
        continue;
      }

      expect(LOGIN_OK_STATUSES).toContain(status);
      return res;
    } catch (error) {
      if (attempt < maxAttempts && isTransientLoginError(error)) {
        await delay(250 * attempt);
        continue;
      }
      throw error;
    }
  }

  throw new Error('[auth.api] Login failed after retries.');
};

export const loginAsUser = async (ctx: APIRequestContext) => {
  const res = await postLoginWithRetry(ctx, {
    username: env.user.username,
    password: env.user.password
  });
  return res;
};

export const loginAsAdmin = async (ctx: APIRequestContext) => {
  const res = await postLoginWithRetry(ctx, {
    username: env.admin.username,
    password: env.admin.password
  });
  return res;
};
