import { test, expect } from '@fixtures/base.fixture';

import { loginAsAdmin, loginAsUser } from '@api/auth.api';
import { routes } from '@config/constants';

test.describe('authz security @security @authz', () => {
  test.use({ seedData: true });

  test('anonymous user is redirected from notifications list @security @authz @regression', async ({ api }) => {
    const res = await api.get(routes.api.notifications, { maxRedirects: 0 });
    expect(res.status()).toBe(302);
  });

  test('user cannot access admin notifications @security @authz @regression', async ({ api }) => {
    await loginAsUser(api);
    const res = await api.get(routes.api.adminNotifications);
    expect(res.status()).toBe(403);
  });

  test('admin can access admin notifications @security @authz @smoke', async ({ api }) => {
    await loginAsAdmin(api);
    const res = await api.get(routes.api.adminNotifications);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
  });
});
