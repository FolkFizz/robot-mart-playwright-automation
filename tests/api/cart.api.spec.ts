import { test, expect } from '@fixtures';
import {
  loginAsUser,
  loginAsAdmin,
  addToCart,
  applyCoupon,
  clearCart,
  getCart,
  removeCartItem,
  removeCoupon,
  updateCartItem
} from '@api';
import { routes } from '@config';
import { seededProducts, coupons } from '@data';

/**
 * Overview: Cart API coverage for item mutation, coupon handling, and cart state retrieval.
 * Summary: Validates add/update/remove flows, stock and quantity validation, and restricted shopping behavior for admin sessions.
 */

test.use({ seedData: true });

test.describe('cart api @api @cart', () => {
  test.describe('positive cases', () => {
    test('CART-API-P01: add, update, remove cart item @api @cart @regression', async ({ api }) => {
      const product = seededProducts[0];

      // Arrange: Login and clear cart
      await loginAsUser(api);
      await clearCart(api);

      // Act & Assert: Add item
      await addToCart(api, product.id, 1);

      let res = await getCart(api);
      let body = await res.json();
      expect(body.ok).toBeTruthy();
      expect(Array.isArray(body.cart)).toBe(true);
      expect(body.cart.some((item: { id: number }) => item.id === product.id)).toBe(true);

      // Act & Assert: Update quantity
      await updateCartItem(api, product.id, 2);
      res = await getCart(api);
      body = await res.json();
      const updated = body.cart.find((item: { id: number }) => item.id === product.id);
      expect(updated?.quantity).toBe(2);

      // Act & Assert: Remove item
      await removeCartItem(api, product.id);
      res = await getCart(api);
      body = await res.json();
      expect(body.cart.some((item: { id: number }) => item.id === product.id)).toBe(false);
    });

    test('CART-API-P02: apply and remove coupon @api @cart @regression', async ({ api }) => {
      const product = seededProducts[0];

      // Arrange: Cart with item
      await loginAsUser(api);
      await clearCart(api);
      await addToCart(api, product.id, 1);

      // Act & Assert: Apply coupon
      const applyRes = await applyCoupon(api, coupons.welcome10.code);
      const applyBody = await applyRes.json();
      expect(applyBody.status).toBe('success');

      // Act & Assert: Remove coupon
      const removeRes = await removeCoupon(api);
      const removeBody = await removeRes.json();
      expect(removeBody.status).toBe('success');
    });
  });

  test.describe('negative cases', () => {
    test('CART-API-N01: add invalid product ID returns error @api @cart @regression', async ({
      api
    }) => {
      // Arrange: Login and clear cart
      await loginAsUser(api);
      await clearCart(api);

      // Act: Try to add product with invalid ID
      const res = await api.post(routes.api.cartAdd, {
        data: { productId: 999999, quantity: 1 },
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });
      const body = await res.json();

      // Assert: Product not found
      expect(res.status()).toBe(404);
      expect(body.status).toBe('error');
      expect(body.message).toContain('Product not found');
    });

    test('CART-API-N02: quantity exceeds stock limit fails gracefully @api @cart @regression', async ({
      api
    }) => {
      const product = seededProducts[0];

      // Arrange: Login and clear cart
      await loginAsUser(api);
      await clearCart(api);

      // Act: Try to add excessive quantity
      const res = await api.post(routes.api.cartAdd, {
        data: { productId: product.id, quantity: 10000 },
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });
      const body = await res.json();

      // Assert: Exceeding stock is rejected
      expect(res.status()).toBe(400);
      expect(body.status).toBe('error');
      expect(body.message.toLowerCase()).toContain('stock');
    });

    test('CART-API-N03: negative quantity rejected @api @cart @regression', async ({ api }) => {
      const product = seededProducts[0];

      // Arrange: Cart with item
      await loginAsUser(api);
      await clearCart(api);
      await addToCart(api, product.id, 1);

      // Act: Try to update with negative quantity
      const res = await api.post(routes.api.cartUpdate, {
        data: { productId: product.id, quantity: -1 },
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });
      const body = await res.json();

      // Assert: Error response
      expect(res.status()).toBe(400);
      expect(body.status).toBe('error');
      expect(body.message).toContain('at least 1');
    });
  });

  test.describe('edge cases', () => {
    test('CART-API-E01: admin user cannot add to cart @api @cart @security @regression', async ({
      api
    }) => {
      const product = seededProducts[0];

      // Arrange: Login as admin
      await loginAsAdmin(api);

      // Act: Try to add to cart
      const res = await api.post(routes.api.cartAdd, {
        data: { productId: product.id, quantity: 1 },
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });
      const body = await res.json();

      // Assert: Admin shopping is blocked
      expect(res.status()).toBe(403);
      expect(body.status).toBe('error');
      expect(body.message).toContain('Admin cannot shop');
    });

    test('CART-API-E02: adding same product multiple times merges quantities @api @cart @regression', async ({
      api
    }) => {
      const product = seededProducts[0];

      // Arrange: Login and clear cart
      await loginAsUser(api);
      await clearCart(api);

      // Act: Add same product twice
      await addToCart(api, product.id, 1);
      await addToCart(api, product.id, 2);

      // Act: Get cart
      const res = await getCart(api);
      const body = await res.json();

      // Assert: Quantity merged (should be 3)
      const item = body.cart.find((item: { id: number }) => item.id === product.id);
      expect(item?.quantity).toBe(3);
    });
  });
});


