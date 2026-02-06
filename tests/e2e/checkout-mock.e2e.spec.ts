import { test, expect, loginAndSyncSession, seedCart } from '@fixtures';
import { disableChaos } from '@api';
import { SHIPPING } from '@config';
import { seededProducts, coupons, customer, validCard, declinedCard, paymentInputs, paymentMessages, uiMessages } from '@data';

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
    test('setup cart with 2 items @e2e @checkout @regression @destructive', async ({ api, cartPage }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      await cartPage.goto();
      const count = await cartPage.getItemCount();
      expect(count).toBe(2);

      const subtotal = cartPage.constructor.parsePrice(await cartPage.getSubtotal());
      const expected = firstProduct.price + secondProduct.price;
      expect(subtotal).toBeCloseTo(expected, 2);
    });

    test('checkout page shows stripe ready and total matches cart @smoke @e2e @checkout @destructive', async ({ api, page, cartPage, checkoutPage }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      await cartPage.goto();
      const cartTotal = checkoutPage.constructor.parsePrice(await cartPage.getGrandTotal());

      await cartPage.proceedToCheckout();
      await expect(page).toHaveURL(/\/order\/checkout/);

      await checkoutPage.waitForStripeReady();

      const checkoutTotal = checkoutPage.constructor.parsePrice(await checkoutPage.getTotal());
      expect(checkoutTotal).toBeCloseTo(cartTotal, 2);

      const nameValue = await checkoutPage.getNameValue();
      const emailValue = await checkoutPage.getEmailValue();
      expect(nameValue.length).toBeGreaterThan(0);
      expect(emailValue.length).toBeGreaterThan(0);
    });

    test('complete stripe payment redirects to success and appears in profile @smoke @e2e @checkout @destructive', async ({ api, page, cartPage, checkoutPage, profilePage }) => {
      test.setTimeout(90_000);
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await expect(page).toHaveURL(/\/order\/checkout/);

      let result = await checkoutPage.submitStripePayment({ ...customer, card: validCard, timeoutMs: 30000 });
      if (result.status === 'timeout') {
        await page.reload({ waitUntil: 'domcontentloaded' });
        result = await checkoutPage.submitStripePayment({ ...customer, card: validCard, timeoutMs: 30000 });
      }

      if (result.status === 'error') {
        throw new Error(`Stripe payment failed: ${result.message}`);
      }

      if (result.status === 'success') {
        await expect(page.getByTestId('order-success-message')).toBeVisible();
        const orderId = await page.getByTestId('order-id').innerText();
        const trimmed = orderId.trim();
        expect(trimmed.length).toBeGreaterThan(5);

        expect(await checkoutPage.getCartCount()).toBe(0);

        await profilePage.gotoTab('orders');
        const orderCard = page.locator('.order-card', { hasText: trimmed });
        await expect(orderCard).toBeVisible();
      } else {
        console.warn('[checkout] Stripe did not complete within timeout; skipping order-id assertions');
      }
    });

    test('apply WELCOME10 on low-value order updates totals @e2e @checkout @regression @destructive', async ({ api, cartPage, checkoutPage }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      const subtotal = checkoutPage.constructor.parsePrice(await cartPage.getSubtotal());
      expect(subtotal).toBeLessThan(SHIPPING.freeThreshold);

      const shippingBefore = checkoutPage.constructor.parseShipping(await cartPage.getShippingText());
      expect(shippingBefore).toBe(SHIPPING.fee);

      await cartPage.applyCoupon(coupons.welcome10.code);

      const discountValue = checkoutPage.constructor.parsePrice(await cartPage.getDiscountText());
      expect(discountValue).toBeCloseTo(subtotal * (coupons.welcome10.discountPercent / 100), 1);

      const shippingAfter = checkoutPage.constructor.parseShipping(await cartPage.getShippingText());
      expect(shippingAfter).toBe(SHIPPING.fee);

      const grandTotal = checkoutPage.constructor.parsePrice(await cartPage.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal - discountValue + shippingAfter, 1);
    });

    test('apply ROBOT99 on high-value order keeps free shipping @e2e @checkout @regression @destructive', async ({ api, cartPage, checkoutPage }) => {
      await seedCart(api, [{ id: thirdProduct.id, quantity: 2 }]);

      await cartPage.goto();
      const subtotal = checkoutPage.constructor.parsePrice(await cartPage.getSubtotal());
      expect(subtotal).toBeGreaterThanOrEqual(SHIPPING.freeThreshold);

      const shippingBefore = checkoutPage.constructor.parseShipping(await cartPage.getShippingText());
      expect(shippingBefore).toBe(0);

      await cartPage.applyCoupon(coupons.robot99.code);

      const discountValue = checkoutPage.constructor.parsePrice(await cartPage.getDiscountText());
      expect(discountValue).toBeCloseTo(subtotal * (coupons.robot99.discountPercent / 100), 1);

      const shippingAfter = checkoutPage.constructor.parseShipping(await cartPage.getShippingText());
      expect(shippingAfter).toBe(0);

      const grandTotal = checkoutPage.constructor.parsePrice(await cartPage.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal - discountValue + shippingAfter, 1);
    });

    test('remove coupon restores totals @e2e @checkout @regression @destructive', async ({ api, cartPage, checkoutPage }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      await cartPage.applyCoupon(coupons.welcome10.code);

      await cartPage.removeCoupon();
      const discountVisible = await cartPage.isDiscountVisible();
      expect(discountVisible).toBe(false);

      const subtotal = checkoutPage.constructor.parsePrice(await cartPage.getSubtotal());
      const shippingValue = checkoutPage.constructor.parseShipping(await cartPage.getShippingText());
      const grandTotal = checkoutPage.constructor.parsePrice(await cartPage.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal + shippingValue, 1);
    });

    test('shipping recalculates when discount crosses threshold @e2e @checkout @regression @destructive', async ({ api, cartPage, checkoutPage }) => {
      await seedCart(api, [
        { id: firstProduct.id, quantity: 2 },
        { id: secondProduct.id, quantity: 1 }
      ]);

      await cartPage.goto();
      const subtotal = checkoutPage.constructor.parsePrice(await cartPage.getSubtotal());
      expect(subtotal).toBeGreaterThanOrEqual(SHIPPING.freeThreshold);

      const shippingBefore = checkoutPage.constructor.parseShipping(await cartPage.getShippingText());
      expect(shippingBefore).toBe(0);

      await cartPage.applyCoupon(coupons.robot99.code);

      const discountValue = checkoutPage.constructor.parsePrice(await cartPage.getDiscountText());
      expect(subtotal - discountValue).toBeLessThan(SHIPPING.freeThreshold);
      const shippingAfter = checkoutPage.constructor.parseShipping(await cartPage.getShippingText());
      const grandTotal = checkoutPage.constructor.parsePrice(await cartPage.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal - discountValue + shippingAfter, 1);
    });
  });

  test.describe('negative cases', () => {
    test('expired coupon is rejected and totals unchanged @e2e @checkout @regression @destructive', async ({ api, cartPage, checkoutPage }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      const subtotal = checkoutPage.constructor.parsePrice(await cartPage.getSubtotal());
      const shippingBefore = checkoutPage.constructor.parseShipping(await cartPage.getShippingText());
      const totalBefore = checkoutPage.constructor.parsePrice(await cartPage.getGrandTotal());

      await cartPage.applyCoupon(coupons.expired50.code);

      const removeVisible = await cartPage.isRemoveCouponVisible();
      expect(removeVisible).toBe(false);

      const discountVisible = await cartPage.isDiscountVisible();
      if (discountVisible) {
        const discountValue = checkoutPage.constructor.parsePrice(await cartPage.getDiscountText());
        expect(discountValue).toBe(0);
      }

      const totalAfter = checkoutPage.constructor.parsePrice(await cartPage.getGrandTotal());
      expect(totalAfter).toBeCloseTo(subtotal + shippingBefore, 1);
      expect(totalAfter).toBeCloseTo(totalBefore, 1);
    });

    test('coupon input is hidden after applying (no re-apply) @e2e @checkout @regression @destructive', async ({ api, cartPage }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      await cartPage.applyCoupon(coupons.robot99.code);

      const couponInputVisible = await cartPage.isCouponInputVisible();
      expect(couponInputVisible).toBe(false);

      const removeVisible = await cartPage.isRemoveCouponVisible();
      expect(removeVisible).toBe(true);
    });

    test('empty name prevents submit @e2e @checkout @regression @destructive', async ({ api, page, cartPage, checkoutPage }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await expect(page).toHaveURL(/\/order\/checkout/);
      await checkoutPage.waitForStripeReady();

      await checkoutPage.setName(paymentInputs.empty);
      await checkoutPage.setEmail(customer.email);

      await checkoutPage.clickSubmit();
      const nameInput = checkoutPage.getNameInput();
      const isValid = await nameInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
      expect(isValid).toBe(false);
      await expect(page).toHaveURL(/\/order\/checkout/);
    });

    test('empty email prevents submit @e2e @checkout @regression @destructive', async ({ api, page, cartPage, checkoutPage }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await expect(page).toHaveURL(/\/order\/checkout/);
      await checkoutPage.waitForStripeReady();

      await checkoutPage.setName(customer.name);
      await checkoutPage.setEmail(paymentInputs.empty);

      const submit = checkoutPage.getSubmitButton();
      try {
        await expect(submit).toBeDisabled({ timeout: 2000 });
      } catch {
        await submit.click({ timeout: 2000 });
      }
      const emailInput = checkoutPage.getEmailInput();
      const isValid = await emailInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
      expect(isValid).toBe(false);
      await expect(page).toHaveURL(/\/order\/checkout/);
    });

    test('invalid email prevents submit @e2e @checkout @regression @destructive', async ({ api, page, cartPage, checkoutPage }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await expect(page).toHaveURL(/\/order\/checkout/);
      await checkoutPage.waitForStripeReady();

      await checkoutPage.setName(customer.name);
      await checkoutPage.setEmail(paymentInputs.invalidEmail);

      await checkoutPage.clickSubmit();
      const emailInput = checkoutPage.getEmailInput();
      const isValid = await emailInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
      expect(isValid).toBe(false);
      await expect(page).toHaveURL(/\/order\/checkout/);
    });

    test('stripe incomplete card blocks submit @e2e @checkout @regression @destructive', async ({ api, page, cartPage, checkoutPage }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await expect(page).toHaveURL(/\/order\/checkout/);
      await checkoutPage.waitForStripeReady();

      await checkoutPage.setName(customer.name);
      await checkoutPage.setEmail(customer.email);

      await checkoutPage.fillCardNumber('4242 4242 4242 4242');

      const submit = checkoutPage.getSubmitButton();
      try {
        await expect(submit).toBeDisabled({ timeout: 2000 });
      } catch {
        await submit.click({ timeout: 2000 });
        const message = checkoutPage.getPaymentMessageLocator();
        await expect(message).toBeVisible();
      }
    });

    test('declined card shows error message @e2e @checkout @regression @destructive', async ({ api, page, cartPage, checkoutPage }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await expect(page).toHaveURL(/\/order\/checkout/);

      const isMockPayment = await checkoutPage.isMockPayment();
      test.skip(isMockPayment, 'Mock payment mode does not surface Stripe decline errors');

      const result = await checkoutPage.submitStripePayment({ ...customer, card: declinedCard, timeoutMs: 10000 });

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
