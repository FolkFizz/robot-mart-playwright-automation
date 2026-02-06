import { test, expect } from '@fixtures';
import { loginAsAdmin, listAdminNotifications, resetStockSafe } from '@api';

test.describe('admin api @api @admin', () => {
  test.use({ seedData: true });

  test('reset stock safe succeeds @api @admin @regression', async ({ api }) => {
    const res = await resetStockSafe(api);
    expect(res.ok()).toBeTruthy();
  });

  test('admin notifications list returns data @api @admin @smoke', async ({ api }) => {
    await loginAsAdmin(api);
    const res = await listAdminNotifications(api);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(Array.isArray(body.notifications)).toBe(true);
  });
});
