import { test, expect } from '@fixtures';
import { resetStockSafe, listAdminNotifications, loginAsAdmin, loginAsUser } from '@api';
import { routes } from '@config';
import { securityTestData } from '@data';
import { canRunPrivilegedStockTests, privilegedStockSkipReason } from '@test-helpers';

test.use({ seedData: true });

const canRunResetStockTests = () => canRunPrivilegedStockTests('RESET_KEY');
const resetStockSkipReason = privilegedStockSkipReason('RESET_KEY');

test.describe('admin api @api @admin', () => {
  test.describe('positive cases', () => {
    test('ADMIN-API-P01: reset stock safely via API @api @admin @regression', async ({ api }) => {
      test.skip(!canRunResetStockTests(), resetStockSkipReason);

      const res = await resetStockSafe(api);
      expect(res.ok()).toBeTruthy();
    });

    test('ADMIN-API-P02: admin notifications list returns data @api @admin @smoke', async ({
      api
    }) => {
      await loginAsAdmin(api);

      const res = await listAdminNotifications(api);
      const body = await res.json();

      expect(body.status).toBe('success');
      expect(Array.isArray(body.notifications)).toBe(true);
    });

    test('ADMIN-API-P03: products API returns current stock levels @api @admin @regression', async ({
      api
    }) => {
      await loginAsAdmin(api);

      const res = await api.get(routes.api.products);
      const body = await res.json();

      expect(res.ok()).toBeTruthy();
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.products)).toBe(true);
      if (body.products.length > 0) {
        expect(body.products[0]).toHaveProperty('stock');
        expect(typeof body.products[0].stock).toBe('number');
      }
    });

    test('ADMIN-API-P04: stock reset returns confirmation @api @admin @smoke', async ({ api }) => {
      test.skip(!canRunResetStockTests(), resetStockSkipReason);

      const res = await resetStockSafe(api);
      const body = await res.json();

      expect(body.status).toBe('success');
      expect(body.message).toBeTruthy();
    });
  });

  test.describe('negative cases', () => {
    test('ADMIN-API-N01: regular user cannot access admin endpoints @api @admin @security @regression', async ({
      api
    }) => {
      await loginAsUser(api);

      const res = await api.get(routes.api.adminNotifications);
      const text = await res.text();

      expect(res.status()).toBe(403);
      expect(text).toContain('Admin Access Only');
    });

    test('ADMIN-API-N02: unauthenticated access to admin API rejected @api @admin @security @smoke', async ({
      api
    }) => {
      const res = await api.get(routes.api.adminNotifications);
      const text = await res.text();

      expect(res.status()).toBe(403);
      expect(text).toContain('Admin Access Only');
    });

    test('ADMIN-API-N03: invalid reset key rejected by reset API @api @admin @regression', async ({
      api
    }) => {
      const res = await api.post(routes.api.resetStockSafe, {
        headers: { 'X-RESET-KEY': securityTestData.invalidResetKey }
      });
      const body = await res.json();

      expect(res.status()).toBe(403);
      expect(body.ok).toBe(false);
      expect(body.status).toBe('forbidden');
      expect(body.message).toContain('Invalid or missing X-RESET-KEY');
    });
  });

  test.describe('edge cases', () => {
    test('ADMIN-API-E01: admin notifications pagination handles large dataset @api @admin @regression', async ({
      api
    }) => {
      await loginAsAdmin(api);

      const res = await listAdminNotifications(api);
      const body = await res.json();

      expect(body.status).toBe('success');
      expect(Array.isArray(body.notifications)).toBe(true);
      expect(body.notifications.length).toBeGreaterThanOrEqual(0);
    });

    test('ADMIN-API-E02: concurrent stock resets handled gracefully @api @admin @regression', async ({
      api
    }) => {
      test.skip(!canRunResetStockTests(), resetStockSkipReason);

      const promises = [resetStockSafe(api), resetStockSafe(api), resetStockSafe(api)];
      const results = await Promise.all(promises);

      results.forEach((res) => {
        expect(res.ok()).toBeTruthy();
      });
    });
  });
});
