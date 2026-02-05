import { test, expect } from '@fixtures/base.fixture';

import { loginAsAdmin, loginAsUser } from '@api/auth.api';
import { routes } from '@config/constants';
import { authInputs, authErrors } from '@data/auth';

test.describe('auth api @api @auth', () => {
  test.use({ seedData: true });

  test('login user returns session cookie @api @auth @smoke', async ({ api }) => {
    const res = await loginAsUser(api);
    const cookieHeader = res.headers()['set-cookie'];
    expect(cookieHeader).toBeTruthy();
  });

  test('login admin returns session cookie @api @auth @regression', async ({ api }) => {
    const res = await loginAsAdmin(api);
    const cookieHeader = res.headers()['set-cookie'];
    expect(cookieHeader).toBeTruthy();
  });

  test('invalid login returns error content @api @auth @regression', async ({ api }) => {
    const res = await api.post(routes.login, {
      form: {
        username: authInputs.wrongUsername,
        password: authInputs.wrongPassword
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain(authErrors.invalidCredentials);
  });
});
