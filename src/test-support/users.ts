import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { createApiContext } from '@api';
import { routes } from '@config';
import { buildTestEmail, isolatedUserPassword } from '@data';

export type TestUser = {
  username: string;
  email: string;
  password: string;
};

type IsolatedUserOptions = {
  prefix?: string;
  label?: string;
  projectName?: string;
  workerIndex?: number;
  password?: string;
};

const buildUniqueToken = (parts: Array<string | number | undefined>): string => {
  const random = Math.random().toString(36).slice(2, 8);
  const cleanParts = parts
    .filter((part) => part !== undefined && part !== null)
    .map((part) => String(part).trim())
    .filter((part) => part.length > 0);
  return [Date.now(), random, ...cleanParts].join('_');
};

export const buildIsolatedUser = (options: IsolatedUserOptions = {}): TestUser => {
  const prefix = options.prefix ?? 'testuser';
  const token = buildUniqueToken([options.projectName, options.workerIndex, options.label]);
  const username = `${prefix}_${token}`.toLowerCase();

  return {
    username,
    email: buildTestEmail(username),
    password: options.password ?? isolatedUserPassword
  };
};

export const registerUser = async (api: APIRequestContext, user: TestUser): Promise<void> => {
  const registerRes = await api.post(routes.register, {
    form: {
      username: user.username,
      email: user.email,
      password: user.password,
      confirmPassword: user.password
    },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    maxRedirects: 0
  });

  expect([200, 302, 303]).toContain(registerRes.status());
};

export const loginUser = async (
  api: APIRequestContext,
  user: Pick<TestUser, 'username' | 'password'>
): Promise<void> => {
  const loginRes = await api.post(routes.login, {
    form: { username: user.username, password: user.password },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    maxRedirects: 0
  });

  expect([200, 302, 303]).toContain(loginRes.status());
};

export const registerAndLoginUser = async (
  api: APIRequestContext,
  user: TestUser
): Promise<void> => {
  await registerUser(api, user);
  await loginUser(api, user);
};

export const registerIsolatedUser = async (
  api: APIRequestContext,
  options: IsolatedUserOptions = {}
): Promise<TestUser> => {
  const user = buildIsolatedUser(options);
  await registerUser(api, user);
  return user;
};

export const registerAndLoginIsolatedUser = async (
  api: APIRequestContext,
  options: IsolatedUserOptions = {}
): Promise<TestUser> => {
  const user = buildIsolatedUser(options);
  await registerAndLoginUser(api, user);
  return user;
};

export const createIsolatedUserContext = async (
  options: IsolatedUserOptions = {}
): Promise<APIRequestContext> => {
  const api = await createApiContext();
  try {
    await registerAndLoginIsolatedUser(api, options);
    return api;
  } catch (error) {
    await api.dispose();
    throw error;
  }
};

export const syncSessionFromApi = async (api: APIRequestContext, page: Page): Promise<void> => {
  const storage = await api.storageState();
  await page.context().addCookies(storage.cookies);
};
