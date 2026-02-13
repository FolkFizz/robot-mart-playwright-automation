import { test, expect, loginAndSyncSession, seedCart } from '@fixtures';
import { loginAsAdmin } from '@api';
import { SHIPPING, routes } from '@config';
import { seededProducts, coupons, uiMessages } from '@data';

/**
 * Overview: End-to-end cart behavior across product selection, quantity changes, coupon use, and checkout entry.
 * Summary: Confirms UI-level cart math, shipping threshold effects, stock feedback, and access rules in realistic customer flows.
 */

test.use({ seedData: true });

test.describe('cart comprehensive @e2e @cart', () => {
  const firstProduct = seededProducts[0]; // Rusty-Bot 101: THB 299.99
  const secondProduct = seededProducts[1]; // Helper-X: THB 450.00

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
  });

  // ========================================================================
  // POSITIVE TEST CASES - Happy Path Scenarios
  // ========================================================================
  test.describe('positive cases', () => {
    test('CART-P01: add first product to empty cart @smoke @e2e @cart @destructive', async ({
      api,
      homePage,
      productPage,
      cartPage
    }) => {
      // Arrange: Start with empty cart
      await seedCart(api, []);

      // Act: Navigate to product and add to cart
      await homePage.goto();
      await homePage.clickProductById(firstProduct.id);
      await productPage.addToCart();

      // Assert: Verify product appears in cart with correct details
      await cartPage.goto();
      expect(await cartPage.isItemVisible(firstProduct.id)).toBe(true);
      expect(await cartPage.getItemName(firstProduct.id)).toContain(firstProduct.name);
      expect(await cartPage.getItemPriceValue(firstProduct.id)).toBeCloseTo(firstProduct.price, 2);
      expect(await cartPage.getItemQuantity(firstProduct.id)).toBe(1);
      expect(await cartPage.getItemTotalValue(firstProduct.id)).toBeCloseTo(firstProduct.price, 2);

      const subtotal = await cartPage.getSubtotalValue();
      expect(subtotal).toBeCloseTo(firstProduct.price, 2);
      expect(await cartPage.getCartCount()).toBe(1);
    });

    test('CART-P02: add second product and verify subtotal calculation @e2e @cart @regression @destructive', async ({
      api,
      homePage,
      productPage,
      cartPage
    }) => {
      // Arrange: Cart has first product already
      await seedCart(api, [{ id: firstProduct.id }]);

      // Act: Add second product
      await homePage.goto();
      await homePage.clickProductById(secondProduct.id);
      await productPage.addToCart();

      // Assert: Both products visible, subtotal is sum of both
      await cartPage.goto();
      expect(await cartPage.isItemVisible(secondProduct.id)).toBe(true);
      expect(await cartPage.getItemName(secondProduct.id)).toContain(secondProduct.name);
      expect(await cartPage.getItemPriceValue(secondProduct.id)).toBeCloseTo(
        secondProduct.price,
        2
      );

      const subtotal = await cartPage.getSubtotalValue();
      const expectedSubtotal = firstProduct.price + secondProduct.price;
      expect(subtotal).toBeCloseTo(expectedSubtotal, 2);
      expect(await cartPage.getCartCount()).toBe(2);

      // Verify shipping fee (below THB 1000 threshold)
      const shippingValue = await cartPage.getShippingValue();
      expect(shippingValue).toBe(SHIPPING.fee);
    });

    test('CART-P03: increase quantity updates totals and enables free shipping @e2e @cart @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Arrange: Cart with 2 items (total is below THB 1000 initially)
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      await cartPage.goto();
      const beforeQty = await cartPage.getItemQuantity(firstProduct.id);

      // Act: Increase quantity of first product
      await cartPage.increaseQtyById(firstProduct.id);

      // Assert: Quantity incremented, row total updated
      const afterQty = await cartPage.getItemQuantity(firstProduct.id);
      expect(afterQty).toBe(beforeQty + 1);

      const rowTotal = await cartPage.getItemTotalValue(firstProduct.id);
      expect(rowTotal).toBeCloseTo(firstProduct.price * afterQty, 2);

      // Verify subtotal calculation
      const subtotal = await cartPage.getSubtotalValue();
      const expectedSubtotal = firstProduct.price * afterQty + secondProduct.price;
      expect(subtotal).toBeCloseTo(expectedSubtotal, 2);

      // Verify free shipping (should be over THB 1000 now)
      const shippingValue = await cartPage.getShippingValue();
      expect(shippingValue).toBe(0);
    });

    test('CART-P04: apply valid coupon reduces grand total @e2e @cart @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Arrange: Cart with 2 products
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      await cartPage.goto();
      const subtotal = await cartPage.getSubtotalValue();

      // Act: Apply valid coupon
      await cartPage.applyCoupon(coupons.robot99.code);

      // Assert: Discount rendered as signed negative value, grand total reduced
      const discountValue = await cartPage.getDiscountValue();
      expect(discountValue).toBeLessThan(0);
      expect(Math.abs(discountValue)).toBeCloseTo(
        subtotal * (coupons.robot99.discountPercent / 100),
        1
      );

      const shippingValue = await cartPage.getShippingValue();
      const grandTotal = await cartPage.getGrandTotalValue();

      // Verify formula: Grand Total = Subtotal + Discount + Shipping
      const expectedTotal = subtotal + discountValue + shippingValue;
      expect(grandTotal).toBeCloseTo(expectedTotal, 1);
    });

    test('CART-P05: remove coupon restores original totals @e2e @cart @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Arrange: Cart with coupon applied
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      await cartPage.goto();
      await cartPage.applyCoupon(coupons.robot99.code);

      // Act: Remove coupon
      await cartPage.removeCoupon();

      // Assert: Discount no longer visible, totals restored
      const discountVisible = await cartPage.isDiscountVisible();
      expect(discountVisible).toBe(false);

      const subtotal = await cartPage.getSubtotalValue();
      const shippingValue = await cartPage.getShippingValue();
      const grandTotal = await cartPage.getGrandTotalValue();
      expect(grandTotal).toBeCloseTo(subtotal + shippingValue, 2);
    });

    test('CART-P06: remove product from cart updates totals @e2e @cart @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Arrange: Cart with 2 products
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      await cartPage.goto();

      // Act: Remove second product
      await cartPage.removeItemById(secondProduct.id);

      // Assert: Product no longer visible
      expect(await cartPage.isItemVisible(secondProduct.id)).toBe(false);

      // Verify subtotal recalculated (only first product remains)
      const qty = await cartPage.getItemQuantity(firstProduct.id);
      const subtotal = await cartPage.getSubtotalValue();
      expect(subtotal).toBeCloseTo(firstProduct.price * qty, 2);
      expect(await cartPage.getCartCount()).toBe(qty);
    });

    test('CART-P07: clear cart empties all items @e2e @cart @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Arrange: Cart with product
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();

      // Act: Clear entire cart
      await cartPage.clearCart();

      // Assert: Cart is empty
      expect(await cartPage.getItemCount()).toBe(0);
      expect(await cartPage.getCartCount()).toBe(0);
      await cartPage.expectEmptyMessageVisible(uiMessages.cartEmpty);
    });

    test('CART-P08: cannot decrease quantity below 1 @e2e @cart @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Arrange: Cart with 1 product at quantity 1
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();

      // Act: Try to decrease quantity
      await cartPage.decreaseQtyById(firstProduct.id);

      // Assert: Quantity remains at 1 (minimum)
      const qty = await cartPage.getItemQuantity(firstProduct.id);
      expect(qty).toBe(1);
    });

    test('COUP-P02: coupon code is case-insensitive @e2e @cart @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Arrange: Cart with product
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();

      // Act: Apply coupon in lowercase (stored as ROBOT99)
      await cartPage.applyCoupon(coupons.robot99.code.toLowerCase());

      // Assert: Coupon accepted despite lowercase
      const discountValue = await cartPage.getDiscountValue();
      expect(discountValue).toBeLessThan(0);
    });
  });

  // ========================================================================
  // NEGATIVE TEST CASES - Error Handling & Validation
  // ========================================================================
  test.describe('negative cases', () => {
    test('CART-N01: cannot add quantity exceeding stock limit @e2e @cart @regression @destructive', async ({
      api
    }) => {
      // Arrange: Empty cart
      await seedCart(api, []);

      // Act: Try to add excessive quantity via API
      const res = await api.post(routes.api.cartAdd, {
        data: { productId: firstProduct.id, quantity: 10000 },
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });

      // Assert: Request rejected with 400 error
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.status).toBe('error');
      expect(body.message.toLowerCase()).toContain('stock');
    });

    test('CART-N02: admin cannot add items to cart via API (security) @e2e @cart @security @regression @destructive', async ({
      api
    }) => {
      // CRITICAL SECURITY TEST
      // Arrange: Login as admin
      await loginAsAdmin(api);

      // Act: Try to add product to cart
      const res = await api.post(routes.api.cartAdd, {
        data: { productId: firstProduct.id, quantity: 1 },
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });

      // Assert: Request forbidden (403)
      expect(res.status()).toBe(403);
      const body = await res.json();
      expect(body.status).toBe('error');
      expect(body.message).toBe('Admin cannot shop');
    });

    test('CART-N02-UI: admin cannot add items to cart via UI @e2e @cart @security @regression @destructive', async ({
      api,
      page,
      homePage,
      productPage
    }) => {
      // Arrange: Login as admin and sync admin session to browser context
      await loginAsAdmin(api);
      const storage = await api.storageState();
      await page.context().clearCookies();
      await page.context().addCookies(storage.cookies);
      await homePage.goto();

      // Act: Navigate to product detail as admin
      await homePage.clickProductById(firstProduct.id);
      const addButtonVisible = await productPage.isAddToCartVisible();
      if (addButtonVisible) {
        expect(await productPage.isAddToCartDisabled()).toBe(true);
      }

      // Assert: Admin cannot complete shopping action
      await expect(page).not.toHaveURL((url) => url.pathname === routes.cart);
      expect(addButtonVisible).toBe(false);
      expect(await homePage.getCartCount()).toBe(0);
    });

    test('CART-N03: add non-existent product returns 404 @e2e @cart @regression @destructive', async ({
      api
    }) => {
      // Act: Try to add product with invalid ID
      const res = await api.post(routes.api.cartAdd, {
        data: { productId: 99999, quantity: 1 },
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });

      // Assert: Not found error
      expect(res.status()).toBe(404);
      const body = await res.json();
      expect(body.status).toBe('error');
      expect(body.message).toBe('Product not found');
    });

    test('CART-N04: cannot update quantity to 0 (minimum is 1) @e2e @cart @regression @destructive', async ({
      api
    }) => {
      // Arrange: Cart with product at quantity 2
      await seedCart(api, [{ id: firstProduct.id, quantity: 2 }]);

      // Act: Try to update to quantity 0
      const res = await api.post(routes.api.cartUpdate, {
        data: { productId: firstProduct.id, quantity: 0 },
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });

      // Assert: Validation error
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.status).toBe('error');
      expect(body.message).toBe('Quantity must be at least 1');
    });

    test('CART-N05: cannot update cart item beyond available stock @e2e @cart @regression @destructive', async ({
      api
    }) => {
      // Arrange: Cart with 1 item
      await seedCart(api, [{ id: firstProduct.id, quantity: 1 }]);

      // Act: Try to update to excessive quantity
      const res = await api.post(routes.api.cartUpdate, {
        data: { productId: firstProduct.id, quantity: 999 },
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });

      // Assert: Stock limit error
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.status).toBe('error');
      expect(body.message).toContain('Stock limit reached');
    });

    test('CART-N07: update cart when empty returns error @e2e @cart @regression @destructive', async ({
      api
    }) => {
      // Arrange: Empty cart
      await seedCart(api, []);

      // Act: Try to update non-existent item
      const res = await api.post(routes.api.cartUpdate, {
        data: { productId: firstProduct.id, quantity: 5 },
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });

      // Assert: Cart empty error
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.status).toBe('error');
      expect(body.message).toBe('Cart is empty');
    });

    test('COUP-N01: invalid coupon code shows error @e2e @cart @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Arrange: Cart with product
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();

      // Act: Apply non-existent coupon
      await cartPage.applyCoupon('INVALID_COUPON_XYZ');

      // Assert: Error message displayed
      await cartPage.expectAlertContains('Invalid coupon code');
    });

    test('COUP-N02: expired coupon rejected with error @e2e @cart @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Arrange: Cart with product
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();

      // Act: Apply expired coupon
      await cartPage.applyCoupon(coupons.expired50.code);

      // Assert: Expiry error shown
      await cartPage.expectAlertContains(uiMessages.couponExpired);
    });
  });

  // ========================================================================
  // EDGE CASES - Boundary Conditions & Special Scenarios
  // ========================================================================
  test.describe('edge cases', () => {
    test('CART-E01: add at exact stock limit succeeds, adding one more fails @e2e @cart @regression @destructive', async ({
      api
    }) => {
      // Arrange: Empty cart
      await seedCart(api, []);

      // Get current stock for product
      const productRes = await api.get(routes.api.productDetail(firstProduct.id));
      expect(productRes.status()).toBe(200);

      const product = await productRes.json();
      const currentStock = product.stock;

      if (currentStock > 0) {
        // Act & Assert: Add exactly the stock amount - should succeed
        const res = await api.post(routes.api.cartAdd, {
          data: { productId: firstProduct.id, quantity: currentStock },
          headers: { Accept: 'application/json' },
          maxRedirects: 0
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.status).toBe('success');
        expect(body.totalItems).toBe(currentStock);

        // Try adding one more unit - should fail
        const res2 = await api.post(routes.api.cartAdd, {
          data: { productId: firstProduct.id, quantity: 1 },
          headers: { Accept: 'application/json' },
          maxRedirects: 0
        });

        expect(res2.status()).toBe(400);
        const body2 = await res2.json();
        expect(body2.status).toBe('error');
        expect(body2.message).toContain('Stock Limit Reached');
      }
    });

    test('COUP-E01: coupon code with whitespace is trimmed @e2e @cart @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Arrange: Cart with product
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();

      // Act: Apply coupon with leading/trailing spaces
      await cartPage.applyCoupon(`  ${coupons.robot99.code}  `);

      // Assert: Coupon accepted (whitespace trimmed internally)
      const discountValue = await cartPage.getDiscountValue();
      expect(discountValue).toBeLessThan(0);
    });

    test('COUP-E05: coupon cleared when cart is cleared @e2e @cart @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Arrange: Cart with product and coupon applied
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      await cartPage.applyCoupon(coupons.robot99.code);

      // Verify coupon applied
      expect(await cartPage.isDiscountVisible()).toBe(true);

      // Act: Clear cart
      await cartPage.clearCart();

      // Re-add item
      await seedCart(api, [{ id: firstProduct.id }]);
      await cartPage.goto();

      // Assert: Coupon no longer applied
      expect(await cartPage.isDiscountVisible()).toBe(false);
    });

    test('COUP-N04: empty coupon code rejected @e2e @cart @regression @destructive', async ({
      api
    }) => {
      // Arrange: Cart with product
      await seedCart(api, [{ id: firstProduct.id }]);

      // Act: Try to apply empty coupon code
      const res = await api.post(routes.api.cartCoupons, {
        data: { code: '' },
        headers: { Accept: 'application/json' },
        maxRedirects: 0
      });

      // Assert: Validation error
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.ok).toBe(false);
      expect(body.status).toBe('error');
      expect(body.message).toBe('Invalid coupon code');
    });
  });
});


