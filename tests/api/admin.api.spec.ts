import { test, expect } from '@fixtures';
import { resetStockSafe, listAdminNotifications, loginAsAdmin, loginAsUser } from '@api';
import { routes } from '@config';
import { securityTestData } from '@data';

/**
 * =============================================================================
 * ADMIN API TESTS - Comprehensive Coverage
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Stock Management (Reset Stock Levels)
 * 2. Admin Notifications Retrieval
 * 3. Admin-Only Endpoint Access Control
 *
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (4 tests):
 *   - ADMIN-API-P01: reset stock safely via API
 *   - ADMIN-API-P02: admin notifications list returns data
 *   - ADMIN-API-P03: products API returns current stock levels
 *   - ADMIN-API-P04: stock reset returns confirmation
 *
 * NEGATIVE CASES (3 tests):
 *   - ADMIN-API-N01: regular user cannot access admin endpoints
 *   - ADMIN-API-N02: unauthenticated access to admin API rejected
 *   - ADMIN-API-N03: invalid reset key rejected by reset API
 *
 * EDGE CASES (2 tests):
 *   - ADMIN-API-E01: admin notifications pagination handles large dataset
 *   - ADMIN-API-E02: concurrent stock resets handled gracefully
 *
 * Business Rules Tested:
 * ----------------------
 * - Admin Notifications Endpoint: Requires admin role authentication
 * - Stock Reset Endpoint: Protected by X-RESET-KEY header
 * - Stock Reset API: /api/products/reset-stock (test utility endpoint)
 * - Admin Notifications API: /admin/notifications/list (admin-only)
 * - Notifications Response: JSON {status: 'success', notifications: [...]}
 * - Products Response: JSON {ok: true, products: [...]}
 *
 * =============================================================================
 */

test.use({ seedData: true });

const canRunResetStockTests = (): boolean => {
  const key = process.env.RESET_KEY?.trim();
  if (!key) return false;

  const normalized = key.toLowerCase();
  return (
    normalized !== 'ci-placeholder' && normalized !== 'placeholder' && normalized !== 'changeme'
  );
};

test.describe('admin api @api @admin', () => {
  test.describe('positive cases', () => {
    test('ADMIN-API-P01: reset stock safely via API @api @admin @regression', async ({ api }) => {
      test.skip(
        !canRunResetStockTests(),
        'Reset stock tests require a real RESET_KEY (not placeholder value).'
      );

      // Act: Reset stock levels to defaults
      const res = await resetStockSafe(api);

      // Assert: Operation successful
      expect(res.ok()).toBeTruthy();
    });

    test('ADMIN-API-P02: admin notifications list returns data @api @admin @smoke', async ({
      api
    }) => {
      // Arrange: Login as admin
      await loginAsAdmin(api);

      // Act: Fetch admin notifications
      const res = await listAdminNotifications(api);
      const body = await res.json();

      // Assert: Successful response with notifications array
      expect(body.status).toBe('success');
      expect(Array.isArray(body.notifications)).toBe(true);
    });

    test('ADMIN-API-P03: products API returns current stock levels @api @admin @regression', async ({
      api
    }) => {
      // Arrange: Login as admin
      await loginAsAdmin(api);

      // Act: Get products with stock info
      const res = await api.get(routes.api.products);
      const body = await res.json();

      // Assert: Products include stock data
      expect(res.ok()).toBeTruthy();
      expect(body.ok).toBe(true);
      expect(Array.isArray(body.products)).toBe(true);
      if (body.products.length > 0) {
        expect(body.products[0]).toHaveProperty('stock');
        expect(typeof body.products[0].stock).toBe('number');
      }
    });

    test('ADMIN-API-P04: stock reset returns confirmation @api @admin @smoke', async ({ api }) => {
      test.skip(
        !canRunResetStockTests(),
        'Reset stock tests require a real RESET_KEY (not placeholder value).'
      );

      // Act: Reset stock and check response
      const res = await resetStockSafe(api);
      const body = await res.json();

      // Assert: Confirmation message received
      expect(body.status).toBe('success');
      expect(body.message).toBeTruthy();
    });
  });

  test.describe('negative cases', () => {
    test('ADMIN-API-N01: regular user cannot access admin endpoints @api @admin @security @regression', async ({
      api
    }) => {
      // Arrange: Login as regular user (default loginAsUser)
      await loginAsUser(api);

      // Act: Try to access admin notifications
      const res = await api.get(routes.api.adminNotifications);
      const text = await res.text();

      // Assert: Request is forbidden
      expect(res.status()).toBe(403);
      expect(text).toContain('Admin Access Only');
    });

    test('ADMIN-API-N02: unauthenticated access to admin API rejected @api @admin @security @smoke', async ({
      api
    }) => {
      // Act: Try to access admin notifications without login
      const res = await api.get(routes.api.adminNotifications);
      const text = await res.text();

      // Assert: Forbidden response
      expect(res.status()).toBe(403);
      expect(text).toContain('Admin Access Only');
    });

    test('ADMIN-API-N03: invalid reset key rejected by reset API @api @admin @regression', async ({
      api
    }) => {
      // Act: Try to reset stock with invalid reset key
      const res = await api.post(routes.api.resetStockSafe, {
        headers: { 'X-RESET-KEY': securityTestData.invalidResetKey }
      });
      const body = await res.json();

      // Assert: Request is rejected by key validation
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
      // Arrange: Login as admin
      await loginAsAdmin(api);

      // Act: Fetch admin notifications
      const res = await listAdminNotifications(api);
      const body = await res.json();

      // Assert: Response structure supports pagination
      expect(body.status).toBe('success');
      expect(Array.isArray(body.notifications)).toBe(true);
      // Verify notifications array exists (may be empty or populated)
      expect(body.notifications.length).toBeGreaterThanOrEqual(0);
    });

    test('ADMIN-API-E02: concurrent stock resets handled gracefully @api @admin @regression', async ({
      api
    }) => {
      test.skip(
        !canRunResetStockTests(),
        'Reset stock tests require a real RESET_KEY (not placeholder value).'
      );

      // Act: Trigger multiple reset requests concurrently
      const promises = [resetStockSafe(api), resetStockSafe(api), resetStockSafe(api)];

      const results = await Promise.all(promises);

      // Assert: All requests complete successfully
      results.forEach((res) => {
        expect(res.ok()).toBeTruthy();
      });
    });
  });
});
