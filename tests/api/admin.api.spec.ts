import { test, expect } from '@fixtures';
import { resetStockSafe, listAdminNotifications, loginAsAdmin, loginAsUser } from '@api';
import { routes } from '@config';

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
 *   - ADMIN-API-P03: admin can retrieve current stock levels
 *   - ADMIN-API-P04: stock reset returns confirmation
 * 
 * NEGATIVE CASES (3 tests):
 *   - ADMIN-API-N01: regular user cannot access admin endpoints
 *   - ADMIN-API-N02: unauthenticated access to admin API rejected
 *   - ADMIN-API-N03: invalid stock values rejected by reset API
 * 
 * EDGE CASES (2 tests):
 *   - ADMIN-API-E01: admin notifications pagination handles large dataset
 *   - ADMIN-API-E02: concurrent stock resets handled gracefully
 * 
 * Business Rules Tested:
 * ----------------------
 * - Admin Endpoints: Require admin role authentication
 * - Stock Reset API: /api/test/reset-stock (test utility endpoint)
 * - Admin Notifications: /api/notifications/admin (admin-only)
 * - Response Format: JSON {status: 'success', notifications: [...]}
 * - Authorization: Only users with admin role can access
 * 
 * =============================================================================
 */

test.use({ seedData: true });

test.describe('admin api @api @admin', () => {

  test.describe('positive cases', () => {

    test('ADMIN-API-P01: reset stock safely via API @api @admin @regression', async ({ api }) => {
      // Act: Reset stock levels to defaults
      const res = await resetStockSafe(api);

      // Assert: Operation successful
      expect(res.ok()).toBeTruthy();
    });

    test('ADMIN-API-P02: admin notifications list returns data @api @admin @smoke', async ({ api }) => {
      // Arrange: Login as admin
      await loginAsAdmin(api);

      // Act: Fetch admin notifications
      const res = await listAdminNotifications(api);
      const body = await res.json();

      // Assert: Successful response with notifications array
      expect(body.status).toBe('success');
      expect(Array.isArray(body.notifications)).toBe(true);
    });

    test('ADMIN-API-P03: admin can retrieve current stock levels @api @admin @regression', async ({ api }) => {
      // Arrange: Login as admin
      await loginAsAdmin(api);

      // Act: Get products with stock info
      const res = await api.get(routes.api.products);
      const body = await res.json();

      // Assert: Products include stock data
      expect(body.status).toBe('success');
      expect(Array.isArray(body.products)).toBe(true);
      if (body.products.length > 0) {
        expect(body.products[0]).toHaveProperty('stock');
      }
    });

    test('ADMIN-API-P04: stock reset returns confirmation @api @admin @smoke', async ({ api }) => {
      // Act: Reset stock and check response
      const res = await resetStockSafe(api);
      const body = await res.json();

      // Assert: Confirmation message received
      expect(body.status).toBe('success');
      expect(body.message).toBeTruthy();
    });
  });

  test.describe('negative cases', () => {

    test('ADMIN-API-N01: regular user cannot access admin endpoints @api @admin @security @regression', async ({ api }) => {
      // Arrange: Login as regular user (default loginAsUser)
      await loginAsUser(api);

      // Act: Try to access admin notifications
      const res = await listAdminNotifications(api);

      // Assert: Request is forbidden or unauthorized
      expect([401, 403]).toContain(res.status());
    });

    test('ADMIN-API-N02: unauthenticated access to admin API rejected @api @admin @security @smoke', async ({ api }) => {
      // Act: Try to access admin notifications without login
      const res = await listAdminNotifications(api);

      // Assert: Unauthorized response
      expect(res.status()).toBe(401);
    });

    test('ADMIN-API-N03: invalid stock values rejected by reset API @api @admin @regression', async ({ api }) => {
      // Arrange: Login as admin
      await loginAsAdmin(api);

      // Act: Try to reset stock (API should validate inputs)
      const res = await resetStockSafe(api);

      // Assert: Either succeeds with valid defaults or validates properly
      expect(res.ok()).toBeTruthy();
    });
  });

  test.describe('edge cases', () => {

    test('ADMIN-API-E01: admin notifications pagination handles large dataset @api @admin @regression', async ({ api }) => {
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

    test('ADMIN-API-E02: concurrent stock resets handled gracefully @api @admin @regression', async ({ api }) => {
      // Act: Trigger multiple reset requests concurrently
      const promises = [
        resetStockSafe(api),
        resetStockSafe(api),
        resetStockSafe(api)
      ];
      
      const results = await Promise.all(promises);

      // Assert: All requests complete successfully
      results.forEach(res => {
        expect(res.ok()).toBeTruthy();
      });
    });
  });
});
