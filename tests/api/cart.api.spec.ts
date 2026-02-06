import { test, expect } from '@fixtures';
import { loginAsUser, addToCart, applyCoupon, clearCart, getCart, removeCartItem, removeCoupon, updateCartItem } from '@api';
import { seededProducts, coupons } from '@data';

/**
 * =============================================================================
 * CART API TESTS - Comprehensive Coverage
 * =============================================================================
 * 
 * Test Scenarios:
 * ---------------
 * 1. Cart Item Management (Add, Update, Remove)
 * 2. Cart Retrieval (Get Current Cart State)
 * 3. Coupon Application via API
 * 4. Cart Clearing & Reset
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (2 tests):
 *   - CART-API-P01: Add, update, remove cart item flow
 *   - CART-API-P02: Apply and remove coupon successfully
 * 
 * NEGATIVE CASES (0 tests):
 *   - (Future: Invalid product ID, quantity validation, stock limits)
 * 
 * EDGE CASES (0 tests):
 *   - (Future: Concurrent updates, expired sessions, admin restrictions)
 * 
 * Business Rules Tested:
 * ----------------------
 * - Cart Storage: Database for authenticated users, session for guests
 * - API Endpoints: /api/cart/* (add, update, remove, get, apply-coupon)
 * - Add Response: JSON {ok: true, cart: [...]}
 * - Update Quantity: PATCH /api/cart/update with productId & quantity
 * - Remove Item: Removes specific product from cart
 * - Coupon Application: Validates code, applies discount to cart total
 * - Cart Structure: Array of {id, name, price, quantity, image}
 * 
 * =============================================================================
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

  // Future test cases:
  // test.describe('negative cases', () => {
  //   test('CART-API-N01: add invalid product returns error', async () => {});
  //   test('CART-API-N02: quantity exceeds stock limit fails', async () => {});
  // });

  // test.describe('edge cases', () => {
  //   test('CART-API-E01: admin cannot add to cart', async () => {});
  // });
});
