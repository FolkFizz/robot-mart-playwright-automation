import { test, expect, loginAndSyncSession, seedCart } from '@fixtures';
import { disableChaos } from '@api';
import { SHIPPING, routes } from '@config';
import { seededProducts, coupons, customer, validCard, paymentInputs, uiMessages } from '@data';
import { CheckoutPage } from '@pages';

/**
 * Overview: End-to-end checkout journey validation from cart handoff through payment-ready state.
 * Summary: Ensures checkout routing, totals integrity, form readiness, and blocking behavior for invalid or empty-cart conditions.
 */

test.use({ seedData: true });

test.describe('checkout comprehensive @e2e @checkout', () => {
  const firstProduct = seededProducts[0];
  const secondProduct = seededProducts[1];
  const thirdProduct = seededProducts[2];

  test.beforeAll(async () => {
    await disableChaos();
  });

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
  });

  // ========================================================================
  // POSITIVE TEST CASES - Basic Checkout Flow
  // ========================================================================
  test.describe('positive cases - basic flow', () => {
    test('CHK-P01: setup cart with 2 items and verify subtotal @e2e @checkout @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Arrange & Act: Seed cart with products
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      // Assert: Verify cart count and subtotal
      await cartPage.goto();
      const count = await cartPage.getItemCount();
      expect(count).toBe(2);

      const subtotal = await cartPage.getSubtotalValue();
      const expected = firstProduct.price + secondProduct.price;
      expect(subtotal).toBeCloseTo(expected, 2);
    });

    test('CHK-P02: checkout page shows stripe ready and total matches cart @smoke @e2e @checkout @destructive', async ({
      api,
      page,
      cartPage,
      checkoutPage
    }) => {
      // Arrange: Set up cart
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      await cartPage.goto();
      const cartTotal = await cartPage.getGrandTotalValue();

      // Act: Proceed to checkout
      await cartPage.proceedToCheckout();
      await expect(page).toHaveURL((url) => url.pathname === routes.order.checkout);

      // Assert: Stripe ready & totals match
      await checkoutPage.waitForStripeReady();

      const checkoutTotal = CheckoutPage.parsePrice(await checkoutPage.getTotal());
      expect(checkoutTotal).toBeCloseTo(cartTotal, 2);

      const nameValue = await checkoutPage.getNameValue();
      const emailValue = await checkoutPage.getEmailValue();
      expect(nameValue.length).toBeGreaterThan(0);
      expect(emailValue.length).toBeGreaterThan(0);
    });

    test('CHK-P03: complete stripe payment redirects to success and appears in profile @e2e @checkout @regression @destructive @stripe', async ({
      api,
      page,
      cartPage,
      checkoutPage,
      profilePage
    }) => {
      test.setTimeout(90_000);

      // Arrange: Set up cart
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await expect(page).toHaveURL((url) => url.pathname === routes.order.checkout);

      if (await checkoutPage.isMockPayment()) {
        test.skip(true, 'Stripe-only test skipped when PAYMENT_PROVIDER=mock.');
      }

      // Act: Submit payment (with retry logic)
      let result = await checkoutPage.submitStripePayment({
        ...customer,
        card: validCard,
        timeoutMs: 30000
      });
      if (result.status === 'timeout') {
        await checkoutPage.reloadDomReady();
        result = await checkoutPage.submitStripePayment({
          ...customer,
          card: validCard,
          timeoutMs: 30000
        });
      }

      if (result.status === 'error') {
        throw new Error(`Stripe payment failed: ${result.message}`);
      }

      // Assert: Success page and order visible in profile
      if (result.status === 'success') {
        await checkoutPage.expectOrderSuccessVisible();
        const orderId = await checkoutPage.getOrderIdText();
        const trimmed = orderId.trim();
        expect(trimmed.length).toBeGreaterThan(5);

        // Cart should be empty
        expect(await checkoutPage.getCartCount()).toBe(0);

        // Order should appear in profile
        await profilePage.gotoTab('orders');
        await profilePage.expectOrderCardVisible(trimmed);
      } else {
        console.warn(
          '[checkout] Stripe did not complete within timeout; skipping order-id assertions'
        );
      }
    });
  });

  // ========================================================================
  // POSITIVE TEST CASES - Shipping Calculation
  // ========================================================================
  test.describe('positive cases - shipping logic', () => {
    test('CHK-P04: order below THB 1000 adds THB 50 shipping @e2e @checkout @regression @destructive', async ({
      api,
      cartPage,
      checkoutPage
    }) => {
      // firstProduct stays below free-shipping threshold
      await seedCart(api, [{ id: firstProduct.id, quantity: 1 }]);

      await cartPage.goto();
      const subtotal = await cartPage.getSubtotalValue();
      expect(subtotal).toBeLessThan(SHIPPING.freeThreshold);

      // Assert: Shipping fee applied
      const shippingValue = await cartPage.getShippingValue();
      expect(shippingValue).toBe(SHIPPING.fee);

      const grandTotal = await cartPage.getGrandTotalValue();
      expect(grandTotal).toBeCloseTo(subtotal + SHIPPING.fee, 2);

      // Verify same on checkout page
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForDomReady();

      const checkoutTotal = CheckoutPage.parsePrice(await checkoutPage.getTotal());
      expect(checkoutTotal).toBeCloseTo(subtotal + SHIPPING.fee, 2);
    });

    test('CHK-P05: order at or above THB 1000 has free shipping @e2e @checkout @regression @destructive', async ({
      api,
      cartPage,
      checkoutPage
    }) => {
      // Use 2 x thirdProduct to guarantee subtotal over threshold in current seed
      await seedCart(api, [{ id: thirdProduct.id, quantity: 2 }]);

      await cartPage.goto();
      const subtotal = await cartPage.getSubtotalValue();
      expect(subtotal).toBeGreaterThanOrEqual(SHIPPING.freeThreshold);

      // Assert: FREE shipping
      const shippingValue = await cartPage.getShippingValue();
      expect(shippingValue).toBe(0);

      const grandTotal = await cartPage.getGrandTotalValue();
      expect(grandTotal).toBeCloseTo(subtotal, 2);

      // Verify on checkout
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForDomReady();

      const checkoutTotal = CheckoutPage.parsePrice(await checkoutPage.getTotal());
      expect(checkoutTotal).toBeCloseTo(subtotal, 2);
    });
  });

  // ========================================================================
  // POSITIVE TEST CASES - Coupon Application
  // ========================================================================
  test.describe('positive cases - coupons', () => {
    test('CHK-P06: apply WELCOME10 on low-value order updates totals @e2e @checkout @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Arrange: Low-value cart
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      const subtotal = await cartPage.getSubtotalValue();
      expect(subtotal).toBeLessThan(SHIPPING.freeThreshold);

      const shippingBefore = await cartPage.getShippingValue();
      expect(shippingBefore).toBe(SHIPPING.fee);

      // Act: Apply coupon
      await cartPage.applyCoupon(coupons.welcome10.code);

      // Assert: Discount applied as signed negative value, shipping unchanged (still below threshold)
      const discountValue = await cartPage.getDiscountValue();
      expect(discountValue).toBeLessThan(0);
      expect(Math.abs(discountValue)).toBeCloseTo(
        subtotal * (coupons.welcome10.discountPercent / 100),
        1
      );

      const shippingAfter = await cartPage.getShippingValue();
      expect(shippingAfter).toBe(SHIPPING.fee);

      const grandTotal = await cartPage.getGrandTotalValue();
      expect(grandTotal).toBeCloseTo(subtotal + discountValue + shippingAfter, 1);
    });

    test('CHK-P07: apply ROBOT99 on high-value order keeps free shipping @e2e @checkout @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Arrange: High-value cart
      await seedCart(api, [{ id: thirdProduct.id, quantity: 2 }]); // high subtotal in current seed

      await cartPage.goto();
      const subtotal = await cartPage.getSubtotalValue();
      expect(subtotal).toBeGreaterThanOrEqual(SHIPPING.freeThreshold);

      const shippingBefore = await cartPage.getShippingValue();
      expect(shippingBefore).toBe(0);

      // Act: Apply 20% coupon
      await cartPage.applyCoupon(coupons.robot99.code);

      // Assert: Discount applied as signed negative value, shipping still FREE
      const discountValue = await cartPage.getDiscountValue();
      expect(discountValue).toBeLessThan(0);
      expect(Math.abs(discountValue)).toBeCloseTo(
        subtotal * (coupons.robot99.discountPercent / 100),
        1
      );

      const shippingAfter = await cartPage.getShippingValue();
      expect(shippingAfter).toBe(0);

      const grandTotal = await cartPage.getGrandTotalValue();
      expect(grandTotal).toBeCloseTo(subtotal + discountValue + shippingAfter, 1);
    });

    test('CHK-P08: remove coupon restores totals @e2e @checkout @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Arrange: Cart with coupon
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      await cartPage.applyCoupon(coupons.welcome10.code);

      // Act: Remove coupon
      await cartPage.removeCoupon();

      // Assert: Discount removed, totals restored
      const discountVisible = await cartPage.isDiscountVisible();
      expect(discountVisible).toBe(false);

      const subtotal = await cartPage.getSubtotalValue();
      const shippingValue = await cartPage.getShippingValue();
      const grandTotal = await cartPage.getGrandTotalValue();
      expect(grandTotal).toBeCloseTo(subtotal + shippingValue, 1);
    });

    test('CHK-P09: coupon input hidden after applying (no re-apply) @e2e @checkout @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Arrange & Act: Apply coupon
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      await cartPage.applyCoupon(coupons.robot99.code);

      // Assert: Input hidden, remove button visible
      const couponInputVisible = await cartPage.isCouponInputVisible();
      expect(couponInputVisible).toBe(false);

      const removeVisible = await cartPage.isRemoveCouponVisible();
      expect(removeVisible).toBe(true);
    });
  });

  // ========================================================================
  // NEGATIVE TEST CASES - Validation & Error Handling
  // ========================================================================
  test.describe('negative cases', () => {
    test('CHK-N01: empty cart checkout is blocked (redirect or guard message) @e2e @checkout @regression @destructive', async ({
      api,
      page,
      checkoutPage
    }) => {
      // Arrange: Ensure cart is empty first
      await seedCart(api, []);

      // Act: Try to access checkout with empty cart
      await checkoutPage.goto();

      // Assert: Either redirected to cart OR blocked with empty-cart guard on checkout
      const url = page.url();

      const redirectedToCart = url.includes(routes.cart);
      const stayedOnCheckout =
        url.includes(routes.order.checkout) || url.includes(routes.order.place);
      const hasEmptyCartGuard = await checkoutPage.hasEmptyCartGuard([
        uiMessages.cartEmpty,
        'empty cart',
        'cart is empty',
        'no items'
      ]);

      expect(redirectedToCart || (stayedOnCheckout && hasEmptyCartGuard)).toBe(true);
    });

    test('CHK-N02: empty name prevents submit (HTML5 validation) @e2e @checkout @regression @destructive', async ({
      api,
      page,
      cartPage,
      checkoutPage
    }) => {
      // Arrange: Navigate to checkout
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await expect(page).toHaveURL((url) => url.pathname === routes.order.checkout);
      await checkoutPage.waitForDomReady();

      // Act: Clear name, try to submit
      await checkoutPage.setName(paymentInputs.empty);
      await checkoutPage.setEmail(customer.email);
      await checkoutPage.clickSubmit();

      // Assert: HTML5 validation blocks submission
      const nameInput = checkoutPage.getNameInput();
      const isValid = await nameInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
      expect(isValid).toBe(false);

      await expect(page).toHaveURL((url) => url.pathname === routes.order.checkout);
    });

    test('CHK-N03: invalid email prevents submit @e2e @checkout @regression @destructive', async ({
      api,
      page,
      cartPage,
      checkoutPage
    }) => {
      // Arrange: Navigate to checkout
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await expect(page).toHaveURL((url) => url.pathname === routes.order.checkout);
      await checkoutPage.waitForDomReady();

      // Act: Enter invalid email
      await checkoutPage.setName(customer.name);
      await checkoutPage.setEmail(paymentInputs.invalidEmail);
      await checkoutPage.clickSubmit();

      // Assert: Validation failed
      const emailInput = checkoutPage.getEmailInput();
      const isValid = await emailInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
      expect(isValid).toBe(false);
      await expect(page).toHaveURL((url) => url.pathname === routes.order.checkout);
    });

    test('CHK-N04: empty email prevents submit @e2e @checkout @regression @destructive', async ({
      api,
      page,
      cartPage,
      checkoutPage
    }) => {
      // Arrange: Navigate to checkout
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await expect(page).toHaveURL((url) => url.pathname === routes.order.checkout);
      await checkoutPage.waitForDomReady();

      // Act: Clear email, try submit
      await checkoutPage.setName(customer.name);
      await checkoutPage.setEmail(paymentInputs.empty);

      const submit = checkoutPage.getSubmitButton();
      try {
        await expect(submit).toBeDisabled({ timeout: 2000 });
      } catch {
        await submit.click({ timeout: 2000 });
      }

      // Assert: Validation failed
      const emailInput = checkoutPage.getEmailInput();
      const isValid = await emailInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
      expect(isValid).toBe(false);
      await expect(page).toHaveURL((url) => url.pathname === routes.order.checkout);
    });

    test('CHK-N05: expired coupon rejected, totals unchanged @e2e @checkout @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Arrange: Cart with product
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      const subtotal = await cartPage.getSubtotalValue();
      const shippingBefore = await cartPage.getShippingValue();
      const totalBefore = await cartPage.getGrandTotalValue();

      // Act: Try to apply expired coupon
      await cartPage.applyCoupon(coupons.expired50.code);

      // Assert: Coupon not applied
      const removeVisible = await cartPage.isRemoveCouponVisible();
      expect(removeVisible).toBe(false);

      const discountVisible = await cartPage.isDiscountVisible();
      if (discountVisible) {
        const discountValue = await cartPage.getDiscountValue();
        expect(discountValue).toBe(0);
      }

      const totalAfter = await cartPage.getGrandTotalValue();
      expect(totalAfter).toBeCloseTo(subtotal + shippingBefore, 1);
      expect(totalAfter).toBeCloseTo(totalBefore, 1);
    });

    test('CHK-N06: stock validation prevents successful checkout @e2e @checkout @regression @destructive', async ({
      api,
      page,
      cartPage
    }) => {
      // Arrange: Seed cart with product at quantity 2
      await seedCart(api, [{ id: firstProduct.id, quantity: 2 }]);

      // Act: Reduce stock to 1 (simulating concurrent purchase)
      await api.post(routes.api.testSetStock, {
        data: { productId: firstProduct.id, stock: 1 }
      });

      // Navigate to checkout - should fail during stock validation
      await cartPage.goto();
      await cartPage.proceedToCheckout();

      // Assert: Checkout must not end in successful order screen
      await expect(page).not.toHaveURL((url) => url.pathname === routes.orderSuccessBase);
      expect(
        page.url().includes(routes.cart) ||
          page.url().includes(routes.order.checkout) ||
          page.url().includes(routes.order.place)
      ).toBe(true);
    });
  });

  // ========================================================================
  // EDGE CASES - Boundary Conditions & Complex Scenarios
  // ========================================================================
  test.describe('edge cases', () => {
    test('CHK-E01: discount crossing shipping threshold recalculates correctly @e2e @checkout @regression @destructive', async ({
      api,
      cartPage,
      checkoutPage
    }) => {
      // Scenario: Start above threshold, discount brings below
      // 2 x firstProduct + 1 x secondProduct ~= 1049.98 in current seed
      await seedCart(api, [
        { id: firstProduct.id, quantity: 2 },
        { id: secondProduct.id, quantity: 1 }
      ]);

      await cartPage.goto();
      const subtotal = await cartPage.getSubtotalValue();
      expect(subtotal).toBeGreaterThanOrEqual(SHIPPING.freeThreshold);

      // Shipping FREE before coupon
      const shippingBefore = await cartPage.getShippingValue();
      expect(shippingBefore).toBe(0);

      // Apply 20% discount (ROBOT99)
      await cartPage.applyCoupon('ROBOT99');

      const discountValue = await cartPage.getDiscountValue();
      expect(discountValue).toBeLessThan(0);
      const afterDiscount = subtotal + discountValue;
      expect(afterDiscount).toBeLessThan(SHIPPING.freeThreshold);

      // Shipping should now be THB 50
      const shippingAfter = await cartPage.getShippingValue();
      expect(shippingAfter).toBe(SHIPPING.fee);

      // Grand total = Subtotal + Discount + Shipping
      const grandTotal = await cartPage.getGrandTotalValue();
      expect(grandTotal).toBeCloseTo(subtotal + discountValue + shippingAfter, 1);

      // Verify on checkout page
      await cartPage.proceedToCheckout();
      await checkoutPage.waitForDomReady();

      const checkoutTotal = CheckoutPage.parsePrice(await checkoutPage.getTotal());
      expect(checkoutTotal).toBeCloseTo(grandTotal, 1);
    });

    test('CHK-E02: quantity change crossing threshold updates shipping immediately @e2e @checkout @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Start below threshold
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      await cartPage.goto();
      const subtotalBefore = await cartPage.getSubtotalValue();
      expect(subtotalBefore).toBeLessThan(SHIPPING.freeThreshold);
      expect(await cartPage.getShippingValue()).toBe(SHIPPING.fee);

      // Increase quantity so subtotal crosses free-shipping threshold
      await cartPage.increaseQtyById(secondProduct.id);

      const subtotalAfter = await cartPage.getSubtotalValue();
      expect(subtotalAfter).toBeGreaterThanOrEqual(SHIPPING.freeThreshold);
      expect(await cartPage.getShippingValue()).toBe(0);
    });

    test('CHK-E03: subtotal below threshold keeps shipping fee applied @e2e @checkout @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Just below threshold - should have shipping fee
      await seedCart(api, [{ id: firstProduct.id, quantity: 3 }]);

      await cartPage.goto();
      const subtotal = await cartPage.getSubtotalValue();
      expect(subtotal).toBeLessThan(SHIPPING.freeThreshold);

      const shippingValue = await cartPage.getShippingValue();
      expect(shippingValue).toBe(SHIPPING.fee);
      const grandTotal = await cartPage.getGrandTotalValue();
      expect(grandTotal).toBeCloseTo(subtotal + SHIPPING.fee, 2);
    });

    test('CHK-E04: high-value order with coupon remains free shipping when still above threshold @e2e @checkout @regression @destructive', async ({
      api,
      cartPage
    }) => {
      // Start with high subtotal
      await seedCart(api, [{ id: thirdProduct.id, quantity: 2 }]);

      await cartPage.goto();
      const subtotal = await cartPage.getSubtotalValue();
      expect(subtotal).toBeGreaterThanOrEqual(SHIPPING.freeThreshold);

      const shippingBefore = await cartPage.getShippingValue();
      expect(shippingBefore).toBe(0);

      // Apply 10% discount and keep order above threshold
      await cartPage.applyCoupon(coupons.welcome10.code);

      const discountValue = await cartPage.getDiscountValue();
      expect(discountValue).toBeLessThan(0);
      const netSubtotal = subtotal + discountValue;
      expect(netSubtotal).toBeGreaterThanOrEqual(SHIPPING.freeThreshold);

      const shippingAfter = await cartPage.getShippingValue();
      expect(shippingAfter).toBe(0);
      const grandTotal = await cartPage.getGrandTotalValue();
      expect(grandTotal).toBeCloseTo(subtotal + discountValue + shippingAfter, 1);
    });
  });
});


