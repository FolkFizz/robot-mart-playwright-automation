import { test } from '@fixtures';
import { routes } from '@config';
import { expectNoServerError, expectSecurityHeaders } from '@utils';

test.describe('security headers @security @headers', () => {
  test('home includes baseline security headers @security @headers @smoke', async ({ api }) => {
    const res = await api.get(routes.home);
    expectNoServerError(res);
    expectSecurityHeaders(res.headers());
  });

  test('products api includes baseline security headers @security @headers @regression', async ({ api }) => {
    const res = await api.get(routes.api.products);
    expectNoServerError(res);
    expectSecurityHeaders(res.headers());
  });
});
