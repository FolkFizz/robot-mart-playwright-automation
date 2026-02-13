import type { APIRequestContext } from '@playwright/test';
import { expect } from '@playwright/test';
import { listAdminNotifications } from '@api';
import { routes } from '@config';
import { canRunPrivilegedStockTests, privilegedStockSkipReason } from '@test-helpers';
import type {
  AdminNotificationsResponse,
  ProductsResponse
} from '@test-helpers/types/api-contracts';

export const canRunResetStockTests = () => canRunPrivilegedStockTests('RESET_KEY');
export const resetStockSkipReason = privilegedStockSkipReason('RESET_KEY');

export const expectAdminForbidden = async (
  api: APIRequestContext,
  endpoint = routes.api.adminNotifications
) => {
  const res = await api.get(endpoint, { maxRedirects: 0 });
  const text = await res.text();

  expect(res.status()).toBe(403);
  expect(text).toContain('Admin Access Only');
};

export const fetchAdminNotifications = async (
  api: APIRequestContext
): Promise<AdminNotificationsResponse> => {
  const res = await listAdminNotifications(api);
  expect(res.status()).toBe(200);
  const body = (await res.json()) as AdminNotificationsResponse;

  expect(body.status).toBe('success');
  expect(Array.isArray(body.notifications)).toBe(true);
  return body;
};

export const fetchProducts = async (api: APIRequestContext): Promise<ProductsResponse> => {
  const res = await api.get(routes.api.products, {
    headers: { Accept: 'application/json' }
  });
  expect(res.ok()).toBeTruthy();

  const body = (await res.json()) as ProductsResponse;
  expect(body.ok).toBe(true);
  expect(Array.isArray(body.products)).toBe(true);
  return body;
};
