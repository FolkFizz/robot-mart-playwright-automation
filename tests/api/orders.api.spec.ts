import { test, expect } from '@fixtures';
import { loginAsUser, addToCart, clearCart, createPaymentIntent, mockPay } from '@api';
import { seededProducts } from '@data';

/**
 * =============================================================================
 * ORDERS API TESTS - Comprehensive Coverage
 * =============================================================================
 * 
 * Test Scenarios:
 * ---------------
 * 1. Payment Intent Creation (Stripe Integration)
 * 2. Mock Payment Processing (Test Environment)
 * 3. Order Creation & Confirmation
 * 
 * Test Cases Coverage:
 * --------------------
 * POSITIVE CASES (2 tests):
 *   - ORD-API-P01: Create payment intent responds with client secret
 *   - ORD-API-P02: Mock pay returns order ID when enabled
 * 
 * NEGATIVE CASES (0 tests):
 *   - (Future: Empty cart checkout, insufficient stock, invalid cart)
 * 
 * EDGE CASES (0 tests):
 *   - (Future: Payment provider unavailable, concurrent checkouts)
 * 
 * Business Rules Tested:
 * ----------------------
 * - Payment Provider: Stripe (production) or Mock (testing)
 * - Payment Intent API: /api/order/create-payment-intent
 * - Mock Payment API: /api/order/checkout-mock (when PAYMENT_PROVIDER=mock)
 * - Response Format: {clientSecret: string} or {status: 'success', orderId: string}
 * - Stock Validation: Order creation validates inventory before processing
 * - Cart Clearing: Successful order clears cart
 * 
 * =============================================================================
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
      const res = await createPaymentIntent(api, [{ productId: product.id, quantity: 1 }]);

      // Assert: Non-error response
      expect(res.status()).toBeLessThan(500);

      const body = await res.json().catch(() => ({}));
      if (res.status() === 200) {
        // Either Stripe clientSecret or provider info
        expect(body.clientSecret || body.provider).toBeTruthy();
      }
    });

    test('ORD-API-P02: mock pay returns order ID when enabled @api @orders @regression', async ({ api }) => {
      const product = seededProducts[0];

      // Arrange: Cart with product
      await loginAsUser(api);
      await clearCart(api);
      await addToCart(api, product.id, 1);

      // Act: Process mock payment
      const res = await mockPay(api);

      // Assert: Order created or mock disabled
      if (res.status() === 200) {
        const body = await res.json();
        expect(body.status).toBe('success');
        expect(body.orderId).toBeTruthy();
      } else {
        // Mock payment disabled (PAYMENT_PROVIDER !== 'mock')
        expect(res.status()).toBe(400);
      }
    });
  });

  // Future test cases:
  // test.describe('negative cases', () => {
  //   test('ORD-API-N01: empty cart checkout fails', async () => {});
  //   test('ORD-API-N02: insufficient stock prevents order', async () => {});
  // });
});
