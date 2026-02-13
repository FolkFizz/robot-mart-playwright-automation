import { test, expect } from '@fixtures';
import { loginAsUser, addToCart, clearCart, getCart } from '@api';
import { routes } from '@config';
import { seededProducts } from '@data';
import { isMockIntentResponse } from '@test-helpers/helpers/api';

/**
 * Overview: Orders API checks for payment-intent creation and checkout preconditions.
 * Summary: Covers mock-vs-stripe intent behavior, empty-cart protections, auth redirects, and concurrent intent request stability.
 */

test.use({ seedData: true });

test.describe('orders api @api @orders', () => {
  test.describe('positive cases', () => {
    test('ORD-API-P01: create payment intent responds @api @orders @smoke', async ({ api }) => {
      const product = seededProducts[0];

      // Arrange: Cart with product
      await loginAsUser(api);
      await clearCart(api);
      await addToCart(api, product.id, 1);

      // Act: Create payment intent
      const res = await api.post(routes.api.orderCreateIntent, {
        data: { items: [{ productId: product.id, quantity: 1 }] },
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });

      // Assert: Non-error response
      expect(res.status()).toBeLessThan(500);

      const body = await res.json().catch(() => ({}));
      if (res.status() === 200) {
        // Stripe mode returns clientSecret, mock mode returns provider/message.
        const mockProvider =
          body.provider === 'mock' ||
          String(body.message ?? '')
            .toLowerCase()
            .includes('mock');

        if (mockProvider) {
          expect(body.provider).toBe('mock');
          expect(String(body.message ?? '').length).toBeGreaterThan(0);
        } else {
          expect(typeof body.clientSecret).toBe('string');
          expect(body.clientSecret.length).toBeGreaterThan(10);
        }
      } else {
        expect(body.error || body.message).toBeTruthy();
      }
    });

    test('ORD-API-P02: mock pay returns order ID when enabled @api @orders @regression', async ({
      api
    }) => {
      const product = seededProducts[0];

      // Arrange: Cart with product
      await loginAsUser(api);
      await clearCart(api);
      await addToCart(api, product.id, 1);

      // Act: Process mock payment
      const res = await api.post(routes.api.orderMockPay, {
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });
      const body = await res.json();

      // Assert: Order created or mock disabled
      if (res.status() === 200) {
        expect(body.status).toBe('success');
        expect(body.orderId).toBeTruthy();
      } else {
        expect(res.status()).toBe(400);
        expect(body.status).toBe('error');
        expect(body.message).toContain('Mock payments are disabled');
      }
    });
  });

  test.describe('negative cases', () => {
    test('ORD-API-N01: empty cart checkout fails @api @orders @regression', async ({ api }) => {
      // Arrange: Login and clear cart
      await loginAsUser(api);
      await clearCart(api);

      // Act: Try to create payment intent with empty cart
      const res = await api.post(routes.api.orderCreateIntent, {
        data: { items: [] },
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });
      const body = await res.json();

      // Assert: Stripe mode rejects empty cart; mock mode returns provider info.
      if (isMockIntentResponse(res.status(), body)) {
        expect(String(body.provider ?? '').toLowerCase()).toBe('mock');
        expect(String(body.message ?? '').toLowerCase()).toContain('mock');
      } else {
        expect(res.status()).toBe(400);
        expect(String(body.error ?? body.message ?? '')).toContain('Cart is empty');
      }
    });

    test('ORD-API-N02: invalid payload items do not bypass empty-cart validation @api @orders @regression', async ({
      api
    }) => {
      // Arrange: Login and clear cart
      await loginAsUser(api);
      await clearCart(api);

      // Act: Send invalid payload item while server-side cart is empty
      const res = await api.post(routes.api.orderCreateIntent, {
        data: { items: [{ productId: 999999, quantity: 99999 }] },
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });
      const body = await res.json();

      // Assert: Stripe mode rejects empty cart; mock mode returns provider info.
      if (isMockIntentResponse(res.status(), body)) {
        expect(String(body.provider ?? '').toLowerCase()).toBe('mock');
        expect(String(body.message ?? '').toLowerCase()).toContain('mock');
      } else {
        expect(res.status()).toBe(400);
        expect(String(body.error ?? body.message ?? '')).toContain('Cart is empty');
      }
    });

    test('ORD-API-N03: unauthenticated checkout is redirected to login @api @orders @security @regression', async ({
      api
    }) => {
      // Act: Call checkout API without login
      const res = await api.post(routes.api.orderCreateIntent, {
        data: { items: [{ productId: seededProducts[0].id, quantity: 1 }] },
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });

      // Assert: Redirected to login
      expect(res.status()).toBe(302);
      expect(res.headers()['location']).toContain(routes.login);
    });
  });

  test.describe('edge cases', () => {
    test('ORD-API-E01: concurrent payment-intent requests stay stable and keep cart intact @api @orders @regression', async ({
      api
    }) => {
      const product = seededProducts[0];

      // Arrange: Cart with product
      await loginAsUser(api);
      await clearCart(api);
      await addToCart(api, product.id, 1);

      // Act: Trigger multiple concurrent payment intents
      const requests = [
        api.post(routes.api.orderCreateIntent, {
          data: { items: [{ productId: product.id, quantity: 1 }] },
          headers: { Accept: 'application/json' },
          maxRedirects: 0
        }),
        api.post(routes.api.orderCreateIntent, {
          data: { items: [{ productId: product.id, quantity: 1 }] },
          headers: { Accept: 'application/json' },
          maxRedirects: 0
        })
      ];

      const results = await Promise.all(requests);

      // Assert: All responses are non-5xx
      results.forEach((res) => {
        expect(res.status()).toBeLessThan(500);
      });

      // Assert: Cart remains until payment is completed
      const cartRes = await getCart(api);
      const cartBody = await cartRes.json();
      const item = cartBody.cart.find((cartItem: { id: number }) => cartItem.id === product.id);
      expect(item?.quantity).toBe(1);
    });
  });
});



