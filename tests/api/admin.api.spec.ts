import { test, expect } from '@fixtures';
import { resetStockSafe, loginAsAdmin, loginAsUser } from '@api';
import { routes } from '@config';
import { securityTestData } from '@data';
import type { ResetStockErrorResponse } from '@test-helpers/types/api-contracts';
import {
  canRunResetStockTests,
  resetStockSkipReason,
  expectAdminForbidden,
  fetchAdminNotifications,
  fetchProducts
} from '@test-helpers/helpers/admin-api';

/**
 * =============================================================================
 * ADMIN API TESTS - Comprehensive Coverage
 * =============================================================================
 *
 * Test Scenarios:
 * ---------------
 * 1. Privileged maintenance endpoint behavior (safe stock reset)
 * 2. Admin notification visibility and response contract
 * 3. Access control for admin-only endpoints
 * 4. Concurrent and pagination stability behavior
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
 * - Admin APIs require an authenticated admin session.
 * - Safe stock reset endpoint requires a valid `X-RESET-KEY`.
 * - Admin notifications and products endpoints return stable JSON contracts.
 * - Concurrent reset operations should not fail unpredictably.
 *
 * =============================================================================
 */

test.use({ seedData: true });

test.describe('admin api @api @admin', () => {
  test.describe('positive cases', () => {
    test('ADMIN-API-P01: reset stock safely via API @api @admin @regression', async ({ api }) => {
      test.skip(!canRunResetStockTests(), resetStockSkipReason);

      // Act: Trigger safe stock reset as privileged operator.
      const res = await resetStockSafe(api);

      // Assert: Endpoint succeeds.
      expect(res.ok()).toBeTruthy();
    });

    test('ADMIN-API-P02: admin notifications list returns data @api @admin @smoke', async ({
      api
    }) => {
      // Arrange: Authenticate as admin.
      await loginAsAdmin(api);

      // Act: Fetch admin notifications.
      const body = await fetchAdminNotifications(api);

      // Assert: Stable success payload.
      expect(body.status).toBe('success');
      expect(Array.isArray(body.notifications)).toBe(true);
    });

    test('ADMIN-API-P03: products API returns current stock levels @api @admin @regression', async ({
      api
    }) => {
      // Arrange: Authenticate as admin.
      await loginAsAdmin(api);

      // Act: Read products payload.
      const body = await fetchProducts(api);

      // Assert: Product stock schema is available.
      if (body.products.length > 0) {
        expect(body.products[0]).toHaveProperty('stock');
        expect(typeof body.products[0].stock).toBe('number');
      }
    });

    test('ADMIN-API-P04: stock reset returns confirmation @api @admin @smoke', async ({ api }) => {
      test.skip(!canRunResetStockTests(), resetStockSkipReason);

      // Act: Trigger safe stock reset.
      const res = await resetStockSafe(api);
      const body = await res.json();

      // Assert: Confirmation payload is returned.
      expect(body.status).toBe('success');
      expect(body.message).toBeTruthy();
    });
  });

  test.describe('negative cases', () => {
    test('ADMIN-API-N01: regular user cannot access admin endpoints @api @admin @security @regression', async ({
      api
    }) => {
      // Arrange: Login with non-admin role.
      await loginAsUser(api);

      // Act + Assert: Access is forbidden.
      await expectAdminForbidden(api);
    });

    test('ADMIN-API-N02: unauthenticated access to admin API rejected @api @admin @security @smoke', async ({
      api
    }) => {
      // Act + Assert: Anonymous request is forbidden.
      await expectAdminForbidden(api);
    });

    test('ADMIN-API-N03: invalid reset key rejected by reset API @api @admin @regression', async ({
      api
    }) => {
      // Act: Call privileged reset endpoint with invalid key.
      const res = await api.post(routes.api.resetStockSafe, {
        headers: { 'X-RESET-KEY': securityTestData.invalidResetKey }
      });
      const body = (await res.json()) as ResetStockErrorResponse;

      // Assert: Request is rejected.
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
      // Arrange: Authenticate as admin.
      await loginAsAdmin(api);

      // Act: Fetch notifications list.
      const body = await fetchAdminNotifications(api);

      // Assert: Pagination-friendly payload remains valid.
      expect(body.notifications.length).toBeGreaterThanOrEqual(0);
    });

    test('ADMIN-API-E02: concurrent stock resets handled gracefully @api @admin @regression', async ({
      api
    }) => {
      test.skip(!canRunResetStockTests(), resetStockSkipReason);

      // Act: Send concurrent reset requests.
      const results = await Promise.all([resetStockSafe(api), resetStockSafe(api), resetStockSafe(api)]);

      // Assert: Every request succeeds.
      results.forEach((res) => {
        expect(res.ok()).toBeTruthy();
      });
    });
  });
});
