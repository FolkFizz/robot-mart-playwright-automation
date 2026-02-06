import { test, expect } from '@fixtures';
import { loginAsUser, addToCart, clearCart, createPaymentIntent, mockPay } from '@api';
import { seededProducts } from '@data';

test.describe('orders api @api @orders', () => {
  test.use({ seedData: true });

  test('create payment intent responds @api @orders @smoke', async ({ api }) => {
    const product = seededProducts[0];

    await loginAsUser(api);
    await clearCart(api);
    await addToCart(api, product.id, 1);

    const res = await createPaymentIntent(api, [{ productId: product.id, quantity: 1 }]);
    expect(res.status()).toBeLessThan(500);

    const body = await res.json().catch(() => ({}));
    if (res.status() === 200) {
      expect(body.clientSecret || body.provider).toBeTruthy();
    }
  });

  test('mock pay returns order id when enabled @api @orders @regression', async ({ api }) => {
    const product = seededProducts[0];

    await loginAsUser(api);
    await clearCart(api);
    await addToCart(api, product.id, 1);

    const res = await mockPay(api);
    if (res.status() === 200) {
      const body = await res.json();
      expect(body.status).toBe('success');
      expect(body.orderId).toBeTruthy();
    } else {
      expect(res.status()).toBe(400);
    }
  });
});
