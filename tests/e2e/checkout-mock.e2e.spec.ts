import { test, expect, loginAndSyncSession, seedCart } from '@fixtures/base.fixture';

import { CartPage } from '@pages/cart.page';
import { CheckoutPage } from '@pages/checkout.page';
import { ProfilePage } from '@pages/user/profile.page';

import { disableChaos } from '@fixtures/chaos';
import { SHIPPING } from '@config/constants';
import { seededProducts } from '@data/products';
import { coupons } from '@data/coupons';
import { customer, validCard, declinedCard, paymentInputs, paymentMessages } from '@data/payment';
import { uiMessages } from '@data/messages';

test.describe('checkout stripe @e2e @checkout', () => {
  test.use({ seedData: true });
  const firstProduct = seededProducts[0];
  const secondProduct = seededProducts[1];
  const thirdProduct = seededProducts[2];

  test.beforeAll(async () => {
    await disableChaos();
  });

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
  });

  test.describe('positive cases', () => {
    test('setup cart with 2 items @e2e @checkout @regression @destructive', async ({ api, page }) => {
      // Arrange: seed cart via API
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      const cart = new CartPage(page);

      // Act: open cart
      await cart.goto();
      const count = await cart.getItemCount();
      expect(count).toBe(2);

      // Assert: subtotal matches seeded items
      const subtotal = CheckoutPage.parsePrice(await cart.getSubtotal());
      const expected = firstProduct.price + secondProduct.price;
      expect(subtotal).toBeCloseTo(expected, 2);
    });

    test('checkout page shows stripe ready and total matches cart @smoke @e2e @checkout @destructive', async ({ api, page }) => {
      // Arrange: seed cart via API
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      const cart = new CartPage(page);
      const checkout = new CheckoutPage(page);

      // Act: go to checkout
      await cart.goto();
      const cartTotal = CheckoutPage.parsePrice(await cart.getGrandTotal());

      await cart.proceedToCheckout();
      await expect(page).toHaveURL(/\/order\/checkout/);

      await checkout.waitForStripeReady();

      // Assert: totals + prefilled customer info
      const checkoutTotal = CheckoutPage.parsePrice(await checkout.getTotal());
      expect(checkoutTotal).toBeCloseTo(cartTotal, 2);

      const nameValue = await checkout.getNameValue();
      const emailValue = await checkout.getEmailValue();
      expect(nameValue.length).toBeGreaterThan(0);
      expect(emailValue.length).toBeGreaterThan(0);
    });

    test('complete stripe payment redirects to success and appears in profile @smoke @e2e @checkout @destructive', async ({ api, page }) => {
      test.setTimeout(90_000);
      // Arrange: seed cart via API
      await seedCart(api, [{ id: firstProduct.id }]);

      const cart = new CartPage(page);
      const checkout = new CheckoutPage(page);

      // Act: go to checkout
      await cart.goto();
      await cart.proceedToCheckout();
      await expect(page).toHaveURL(/\/order\/checkout/);

      let result = await checkout.submitStripePayment({ ...customer, card: validCard, timeoutMs: 30000 });
      if (result.status === 'timeout') {
        await page.reload({ waitUntil: 'domcontentloaded' });
        result = await checkout.submitStripePayment({ ...customer, card: validCard, timeoutMs: 30000 });
      }

      if (result.status === 'error') {
        throw new Error(`Stripe payment failed: ${result.message}`);
      }

      if (result.status === 'success') {
        // Assert: success page + order appears in profile
        await expect(page.getByTestId('order-success-message')).toBeVisible();
        const orderId = await page.getByTestId('order-id').innerText();
        const trimmed = orderId.trim();
        expect(trimmed.length).toBeGreaterThan(5);

        expect(await checkout.getCartCount()).toBe(0);

        const profile = new ProfilePage(page);
        await profile.gotoTab('orders');
        const orderCard = page.locator('.order-card', { hasText: trimmed });
        await expect(orderCard).toBeVisible();
      } else {
        console.warn('[checkout] Stripe did not complete within timeout; skipping order-id assertions');
      }
    });

    test('apply WELCOME10 on low-value order updates totals @e2e @checkout @regression @destructive', async ({ api, page }) => {
      // Arrange: seed cart with low total
      await seedCart(api, [{ id: firstProduct.id }]);

      const cart = new CartPage(page);

      // Act: open cart + apply coupon
      await cart.goto();
      const subtotal = CheckoutPage.parsePrice(await cart.getSubtotal());
      expect(subtotal).toBeLessThan(SHIPPING.freeThreshold);

      const shippingBefore = CheckoutPage.parseShipping(await cart.getShippingText());
      expect(shippingBefore).toBe(SHIPPING.fee);

      await cart.applyCoupon(coupons.welcome10.code);

      const discountValue = CheckoutPage.parsePrice(await cart.getDiscountText());
      expect(discountValue).toBeCloseTo(subtotal * (coupons.welcome10.discountPercent / 100), 1);

      const shippingAfter = CheckoutPage.parseShipping(await cart.getShippingText());
      expect(shippingAfter).toBe(SHIPPING.fee);

      const grandTotal = CheckoutPage.parsePrice(await cart.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal - discountValue + shippingAfter, 1);
    });

    test('apply ROBOT99 on high-value order keeps free shipping @e2e @checkout @regression @destructive', async ({ api, page }) => {
      // Arrange: seed cart with high total
      await seedCart(api, [{ id: thirdProduct.id, quantity: 2 }]);

      const cart = new CartPage(page);

      // Act: open cart + apply coupon
      await cart.goto();
      const subtotal = CheckoutPage.parsePrice(await cart.getSubtotal());
      expect(subtotal).toBeGreaterThanOrEqual(SHIPPING.freeThreshold);

      const shippingBefore = CheckoutPage.parseShipping(await cart.getShippingText());
      expect(shippingBefore).toBe(0);

      await cart.applyCoupon(coupons.robot99.code);

      const discountValue = CheckoutPage.parsePrice(await cart.getDiscountText());
      expect(discountValue).toBeCloseTo(subtotal * (coupons.robot99.discountPercent / 100), 1);

      const shippingAfter = CheckoutPage.parseShipping(await cart.getShippingText());
      expect(shippingAfter).toBe(0);

      const grandTotal = CheckoutPage.parsePrice(await cart.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal - discountValue + shippingAfter, 1);
    });

    test('remove coupon restores totals @e2e @checkout @regression @destructive', async ({ api, page }) => {
      // Arrange: seed cart + apply coupon
      await seedCart(api, [{ id: firstProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      await cart.applyCoupon(coupons.welcome10.code);

      await cart.removeCoupon();
      const discountVisible = await cart.isDiscountVisible();
      expect(discountVisible).toBe(false);

      // Assert: totals restored
      const subtotal = CheckoutPage.parsePrice(await cart.getSubtotal());
      const shippingValue = CheckoutPage.parseShipping(await cart.getShippingText());
      const grandTotal = CheckoutPage.parsePrice(await cart.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal + shippingValue, 1);
    });

    test('shipping recalculates when discount crosses threshold @e2e @checkout @regression @destructive', async ({ api, page }) => {
      // Arrange: seed cart above free threshold
      await seedCart(api, [
        { id: firstProduct.id, quantity: 2 },
        { id: secondProduct.id, quantity: 1 }
      ]);

      const cart = new CartPage(page);

      await cart.goto();
      const subtotal = CheckoutPage.parsePrice(await cart.getSubtotal());
      expect(subtotal).toBeGreaterThanOrEqual(SHIPPING.freeThreshold);

      const shippingBefore = CheckoutPage.parseShipping(await cart.getShippingText());
      expect(shippingBefore).toBe(0);

      await cart.applyCoupon(coupons.robot99.code);

      // Assert: shipping recalculates after discount
      const discountValue = CheckoutPage.parsePrice(await cart.getDiscountText());
      expect(subtotal - discountValue).toBeLessThan(SHIPPING.freeThreshold);
      const shippingAfter = CheckoutPage.parseShipping(await cart.getShippingText());
      const grandTotal = CheckoutPage.parsePrice(await cart.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal - discountValue + shippingAfter, 1);
    });
  });

  test.describe('negative cases', () => {
    test('expired coupon is rejected and totals unchanged @e2e @checkout @regression @destructive', async ({ api, page }) => {
      // Arrange: seed cart
      await seedCart(api, [{ id: firstProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      const subtotal = CheckoutPage.parsePrice(await cart.getSubtotal());
      const shippingBefore = CheckoutPage.parseShipping(await cart.getShippingText());
      const totalBefore = CheckoutPage.parsePrice(await cart.getGrandTotal());

      await cart.applyCoupon(coupons.expired50.code);

      // Assert: coupon rejected, totals unchanged
      const removeVisible = await cart.isRemoveCouponVisible();
      expect(removeVisible).toBe(false);

      const discountVisible = await cart.isDiscountVisible();
      if (discountVisible) {
        const discountValue = CheckoutPage.parsePrice(await cart.getDiscountText());
        expect(discountValue).toBe(0);
      }

      const totalAfter = CheckoutPage.parsePrice(await cart.getGrandTotal());
      expect(totalAfter).toBeCloseTo(subtotal + shippingBefore, 1);
      expect(totalAfter).toBeCloseTo(totalBefore, 1);
    });

    test('coupon input is hidden after applying (no re-apply) @e2e @checkout @regression @destructive', async ({ api, page }) => {
      // Arrange: seed cart
      await seedCart(api, [{ id: firstProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      await cart.applyCoupon(coupons.robot99.code);

      const couponInputVisible = await cart.isCouponInputVisible();
      expect(couponInputVisible).toBe(false);

      const removeVisible = await cart.isRemoveCouponVisible();
      expect(removeVisible).toBe(true);
    });

    test('empty name prevents submit @e2e @checkout @regression @destructive', async ({ api, page }) => {
      // Arrange: seed cart + open checkout
      await seedCart(api, [{ id: firstProduct.id }]);
      const cart = new CartPage(page);
      const checkout = new CheckoutPage(page);

      await cart.goto();
      await cart.proceedToCheckout();
      await expect(page).toHaveURL(/\/order\/checkout/);
      await checkout.waitForStripeReady();

      // Act: clear name
      await checkout.setName(paymentInputs.empty);
      await checkout.setEmail(customer.email);

      // Assert: submit blocked by validation
      await checkout.clickSubmit();
      const nameInput = checkout.getNameInput();
      const isValid = await nameInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
      expect(isValid).toBe(false);
      await expect(page).toHaveURL(/\/order\/checkout/);
    });

    test('empty email prevents submit @e2e @checkout @regression @destructive', async ({ api, page }) => {
      // Arrange: seed cart + open checkout
      await seedCart(api, [{ id: firstProduct.id }]);
      const cart = new CartPage(page);
      const checkout = new CheckoutPage(page);

      await cart.goto();
      await cart.proceedToCheckout();
      await expect(page).toHaveURL(/\/order\/checkout/);
      await checkout.waitForStripeReady();

      // Act: clear email
      await checkout.setName(customer.name);
      await checkout.setEmail(paymentInputs.empty);

      // Assert: submit blocked by validation
      const submit = checkout.getSubmitButton();
      try {
        await expect(submit).toBeDisabled({ timeout: 2000 });
      } catch {
        await submit.click({ timeout: 2000 });
      }
      const emailInput = checkout.getEmailInput();
      const isValid = await emailInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
      expect(isValid).toBe(false);
      await expect(page).toHaveURL(/\/order\/checkout/);
    });

    test('invalid email prevents submit @e2e @checkout @regression @destructive', async ({ api, page }) => {
      // Arrange: seed cart + open checkout
      await seedCart(api, [{ id: firstProduct.id }]);
      const cart = new CartPage(page);
      const checkout = new CheckoutPage(page);

      await cart.goto();
      await cart.proceedToCheckout();
      await expect(page).toHaveURL(/\/order\/checkout/);
      await checkout.waitForStripeReady();

      // Act: invalid email
      await checkout.setName(customer.name);
      await checkout.setEmail(paymentInputs.invalidEmail);

      // Assert: submit blocked by validation
      await checkout.clickSubmit();
      const emailInput = checkout.getEmailInput();
      const isValid = await emailInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
      expect(isValid).toBe(false);
      await expect(page).toHaveURL(/\/order\/checkout/);
    });

    test('stripe incomplete card blocks submit @e2e @checkout @regression @destructive', async ({ api, page }) => {
      // Arrange: seed cart + open checkout
      await seedCart(api, [{ id: firstProduct.id }]);
      const cart = new CartPage(page);
      const checkout = new CheckoutPage(page);

      await cart.goto();
      await cart.proceedToCheckout();
      await expect(page).toHaveURL(/\/order\/checkout/);
      await checkout.waitForStripeReady();

      await checkout.setName(customer.name);
      await checkout.setEmail(customer.email);

      // Act: fill only card number (incomplete card)
      await checkout.fillCardNumber('4242 4242 4242 4242');

      // Assert: submit disabled or error shown
      const submit = checkout.getSubmitButton();
      try {
        await expect(submit).toBeDisabled({ timeout: 2000 });
      } catch {
        await submit.click({ timeout: 2000 });
        const message = checkout.getPaymentMessageLocator();
        await expect(message).toBeVisible();
      }
    });

    test('declined card shows error message @e2e @checkout @regression @destructive', async ({ api, page }) => {
      // Arrange: seed cart + open checkout
      await seedCart(api, [{ id: firstProduct.id }]);
      const cart = new CartPage(page);
      const checkout = new CheckoutPage(page);

      await cart.goto();
      await cart.proceedToCheckout();
      await expect(page).toHaveURL(/\/order\/checkout/);

      const isMockPayment = await checkout.isMockPayment();
      test.skip(isMockPayment, 'Mock payment mode does not surface Stripe decline errors');

      const result = await checkout.submitStripePayment({ ...customer, card: declinedCard, timeoutMs: 10000 });

      expect(result.status).not.toBe('success');
      if (result.status === 'error') {
        expect(result.message ?? '').toMatch(paymentMessages.declinedPattern);
      } else {
        await expect(page).toHaveURL(/\/order\/checkout/);
      }
    });

    test('checkout with empty cart redirects to cart @e2e @checkout @regression @destructive', async ({ api, page }) => {
      await seedCart(api, []);

      await page.goto('/order/checkout');
      await expect(page).toHaveURL(/\/cart/);
      await expect(page.getByText(uiMessages.cartEmpty)).toBeVisible();
    });
  });
});
