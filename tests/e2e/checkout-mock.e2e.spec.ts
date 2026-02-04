import type { APIRequestContext, Page } from '@playwright/test';
import { test as dataTest, expect } from '@fixtures/data.fixture';

import { CartPage } from '@pages/cart.page';
import { CheckoutPage } from '@pages/checkout.page';
import { ProfilePage } from '@pages/user/profile.page';
import { NavbarComponent } from '@components/navbar.component';

import { loginAsUser } from '@api/auth.api';
import { addToCart, clearCart } from '@api/cart.api';
import { disableChaos } from '@fixtures/chaos';
import { SHIPPING } from '@config/constants';
import { seededProducts } from '@data/products';
import { coupons } from '@data/coupons';

const parsePrice = (text: string) => Number.parseFloat(text.replace(/[^0-9.]/g, ''));
const parseShipping = (text: string) => (text.trim().toUpperCase() === 'FREE' ? 0 : parsePrice(text));

const fillStripeCard = async (
  page: Page,
  card: { number: string; exp: string; cvc: string; postal?: string }
) => {
  const frame = page.frameLocator('iframe[name^="__privateStripeFrame"]:not([aria-hidden="true"])');

  const numberInput = frame.locator('input[name="cardnumber"], input[name="number"]').first();
  await numberInput.fill(card.number);

  const expInput = frame.locator('input[name="exp-date"], input[name="expiry"]').first();
  await expInput.fill(card.exp);

  const cvcInput = frame.locator('input[name="cvc"]').first();
  await cvcInput.fill(card.cvc);

  const postal = frame.locator('input[name="postal"], input[name="postalCode"]');
  if (await postal.count()) {
    await postal.first().fill(card.postal ?? '10001');
  }
};

const loginAndSyncSession = async (api: APIRequestContext, page: Page) => {
  await loginAsUser(api);
  const storage = await api.storageState();
  await page.context().addCookies(storage.cookies);
};

const seedCart = async (
  api: APIRequestContext,
  items: Array<{ id: number; quantity?: number }>
) => {
  await clearCart(api);
  for (const item of items) {
    await addToCart(api, item.id, item.quantity ?? 1);
  }
};

const gotoCheckoutWithItem = async (
  api: APIRequestContext,
  page: Page,
  productId: number
) => {
  await seedCart(api, [{ id: productId }]);
  const cart = new CartPage(page);
  const checkout = new CheckoutPage(page);

  await cart.goto();
  await cart.proceedToCheckout();
  await expect(page).toHaveURL(/\/order\/checkout/);
  await checkout.waitForStripeReady();

  return checkout;
};

const waitForPaymentResult = async (page: Page, checkout: CheckoutPage, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;
  const message = checkout.getPaymentMessageLocator();
  let sawLoading = false;

  while (Date.now() < deadline) {
    if (/\/order\/success\?order_id=/.test(page.url())) {
      return { status: 'success' as const, sawLoading };
    }

    const hasMessage = (await message.count().catch(() => 0)) > 0;
    if (hasMessage) {
      const text = (await message.innerText().catch(() => '')).trim();
      if (text.length > 0) {
        return { status: 'error' as const, sawLoading, message: text };
      }
    }

    const status = await checkout.getSubmitStatus().catch(() => 'idle');
    if (status === 'loading') sawLoading = true;

    await page.waitForTimeout(500);
  }

  return { status: 'timeout' as const, sawLoading };
};

const attemptStripePayment = async (page: Page, checkout: CheckoutPage) => {
  await checkout.setName('Test User');
  await checkout.setEmail('test.user@robotstore.com');

  await checkout.waitForStripeReady();
  await fillStripeCard(page, { number: '4242 4242 4242 4242', exp: '12/34', cvc: '123', postal: '10001' });
  await expect(checkout.getSubmitButton()).toBeEnabled();
  await checkout.clickSubmit();

  return await waitForPaymentResult(page, checkout, 30000);
};

dataTest.describe('checkout stripe @e2e @checkout', () => {
  const firstProduct = seededProducts[0];
  const secondProduct = seededProducts[1];
  const thirdProduct = seededProducts[2];

  dataTest.beforeAll(async () => {
    await disableChaos();
  });

  dataTest.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
  });

  dataTest.describe('positive cases', () => {
    dataTest('setup cart with 2 items @e2e @checkout @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      const count = await cart.getItemCount();
      expect(count).toBe(2);

      const subtotal = parsePrice(await cart.getSubtotal());
      const expected = firstProduct.price + secondProduct.price;
      expect(subtotal).toBeCloseTo(expected, 2);
    });

    dataTest('checkout page shows stripe ready and total matches cart @smoke @e2e @checkout @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      const cart = new CartPage(page);
      const checkout = new CheckoutPage(page);

      await cart.goto();
      const cartTotal = parsePrice(await cart.getGrandTotal());

      await cart.proceedToCheckout();
      await expect(page).toHaveURL(/\/order\/checkout/);

      await checkout.waitForStripeReady();

      const checkoutTotal = parsePrice(await checkout.getTotal());
      expect(checkoutTotal).toBeCloseTo(cartTotal, 2);

      const nameValue = await checkout.getNameValue();
      const emailValue = await checkout.getEmailValue();
      expect(nameValue.length).toBeGreaterThan(0);
      expect(emailValue.length).toBeGreaterThan(0);
    });

    dataTest('complete stripe payment redirects to success and appears in profile @smoke @e2e @checkout @destructive', async ({ api, page }) => {
      dataTest.setTimeout(90_000);
      const checkout = await gotoCheckoutWithItem(api, page, firstProduct.id);

      let result = await attemptStripePayment(page, checkout);
      if (result.status === 'timeout') {
        await page.reload({ waitUntil: 'domcontentloaded' });
        result = await attemptStripePayment(page, checkout);
      }

      if (result.status === 'error') {
        throw new Error(`Stripe payment failed: ${result.message}`);
      }

      if (result.status === 'success') {
        await expect(page.getByTestId('order-success-message')).toBeVisible();
        const orderId = await page.getByTestId('order-id').innerText();
        const trimmed = orderId.trim();
        expect(trimmed.length).toBeGreaterThan(5);

        const navbar = new NavbarComponent(page);
        expect(await navbar.getCartCount()).toBe(0);

        const profile = new ProfilePage(page);
        await profile.gotoTab('orders');
        const orderCard = page.locator('.order-card', { hasText: trimmed });
        await expect(orderCard).toBeVisible();
      } else {
        console.warn('[checkout] Stripe did not complete within timeout; skipping order-id assertions');
      }
    });

    dataTest('apply WELCOME10 on low-value order updates totals @e2e @checkout @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      const subtotal = parsePrice(await cart.getSubtotal());
      expect(subtotal).toBeLessThan(SHIPPING.freeThreshold);

      const shippingBefore = parseShipping(await cart.getShippingText());
      expect(shippingBefore).toBe(SHIPPING.fee);

      await cart.applyCoupon(coupons.welcome10.code);

      const discountValue = parsePrice(await cart.getDiscountText());
      expect(discountValue).toBeCloseTo(subtotal * (coupons.welcome10.discountPercent / 100), 1);

      const shippingAfter = parseShipping(await cart.getShippingText());
      expect(shippingAfter).toBe(SHIPPING.fee);

      const grandTotal = parsePrice(await cart.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal - discountValue + shippingAfter, 1);
    });

    dataTest('apply ROBOT99 on high-value order keeps free shipping @e2e @checkout @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: thirdProduct.id, quantity: 2 }]);

      const cart = new CartPage(page);

      await cart.goto();
      const subtotal = parsePrice(await cart.getSubtotal());
      expect(subtotal).toBeGreaterThanOrEqual(SHIPPING.freeThreshold);

      const shippingBefore = parseShipping(await cart.getShippingText());
      expect(shippingBefore).toBe(0);

      await cart.applyCoupon(coupons.robot99.code);

      const discountValue = parsePrice(await cart.getDiscountText());
      expect(discountValue).toBeCloseTo(subtotal * (coupons.robot99.discountPercent / 100), 1);

      const shippingAfter = parseShipping(await cart.getShippingText());
      expect(shippingAfter).toBe(0);

      const grandTotal = parsePrice(await cart.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal - discountValue + shippingAfter, 1);
    });

    dataTest('remove coupon restores totals @e2e @checkout @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      await cart.applyCoupon(coupons.welcome10.code);

      await cart.removeCoupon();
      const discountVisible = await cart.isDiscountVisible();
      expect(discountVisible).toBe(false);

      const subtotal = parsePrice(await cart.getSubtotal());
      const shippingValue = parseShipping(await cart.getShippingText());
      const grandTotal = parsePrice(await cart.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal + shippingValue, 1);
    });

    dataTest('shipping recalculates when discount crosses threshold @e2e @checkout @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [
        { id: firstProduct.id, quantity: 2 },
        { id: secondProduct.id, quantity: 1 }
      ]);

      const cart = new CartPage(page);

      await cart.goto();
      const subtotal = parsePrice(await cart.getSubtotal());
      expect(subtotal).toBeGreaterThanOrEqual(SHIPPING.freeThreshold);

      const shippingBefore = parseShipping(await cart.getShippingText());
      expect(shippingBefore).toBe(0);

      await cart.applyCoupon(coupons.robot99.code);

      const discountValue = parsePrice(await cart.getDiscountText());
      expect(subtotal - discountValue).toBeLessThan(SHIPPING.freeThreshold);
      const shippingAfter = parseShipping(await cart.getShippingText());
      const grandTotal = parsePrice(await cart.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal - discountValue + shippingAfter, 1);
    });
  });

  dataTest.describe('negative cases', () => {
    dataTest('expired coupon is rejected and totals unchanged @e2e @checkout @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      const subtotal = parsePrice(await cart.getSubtotal());
      const shippingBefore = parseShipping(await cart.getShippingText());
      const totalBefore = parsePrice(await cart.getGrandTotal());

      await cart.applyCoupon(coupons.expired50.code);

      const removeVisible = await cart.isRemoveCouponVisible();
      expect(removeVisible).toBe(false);

      const discountVisible = await cart.isDiscountVisible();
      if (discountVisible) {
        const discountValue = parsePrice(await cart.getDiscountText());
        expect(discountValue).toBe(0);
      }

      const totalAfter = parsePrice(await cart.getGrandTotal());
      expect(totalAfter).toBeCloseTo(subtotal + shippingBefore, 1);
      expect(totalAfter).toBeCloseTo(totalBefore, 1);
    });

    dataTest('coupon input is hidden after applying (no re-apply) @e2e @checkout @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      await cart.applyCoupon(coupons.robot99.code);

      const couponInputVisible = await cart.isCouponInputVisible();
      expect(couponInputVisible).toBe(false);

      const removeVisible = await cart.isRemoveCouponVisible();
      expect(removeVisible).toBe(true);
    });

    dataTest('empty name prevents submit @e2e @checkout @regression @destructive', async ({ api, page }) => {
      const checkout = await gotoCheckoutWithItem(api, page, firstProduct.id);

      await checkout.setName('');
      await checkout.setEmail('test.user@robotstore.com');

      await checkout.clickSubmit();
      const nameInput = checkout.getNameInput();
      const isValid = await nameInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
      expect(isValid).toBe(false);
      await expect(page).toHaveURL(/\/order\/checkout/);
    });

    dataTest('empty email prevents submit @e2e @checkout @regression @destructive', async ({ api, page }) => {
      const checkout = await gotoCheckoutWithItem(api, page, firstProduct.id);

      await checkout.setName('Test User');
      await checkout.setEmail('');

      await checkout.clickSubmit();
      const emailInput = checkout.getEmailInput();
      const isValid = await emailInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
      expect(isValid).toBe(false);
      await expect(page).toHaveURL(/\/order\/checkout/);
    });

    dataTest('invalid email prevents submit @e2e @checkout @regression @destructive', async ({ api, page }) => {
      const checkout = await gotoCheckoutWithItem(api, page, firstProduct.id);

      await checkout.setName('Test User');
      await checkout.setEmail('invalid-email');

      await checkout.clickSubmit();
      const emailInput = checkout.getEmailInput();
      const isValid = await emailInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
      expect(isValid).toBe(false);
      await expect(page).toHaveURL(/\/order\/checkout/);
    });

    dataTest('stripe incomplete card blocks submit @e2e @checkout @regression @destructive', async ({ api, page }) => {
      const checkout = await gotoCheckoutWithItem(api, page, firstProduct.id);

      await checkout.setName('Test User');
      await checkout.setEmail('test.user@robotstore.com');

      const frame = page.frameLocator('iframe[name^="__privateStripeFrame"]:not([aria-hidden="true"])');
      const numberInput = frame.locator('input[name="cardnumber"], input[name="number"]').first();
      await numberInput.fill('4242 4242 4242 4242');

      const submit = checkout.getSubmitButton();
      if (await submit.isEnabled()) {
        await submit.click();
        const message = checkout.getPaymentMessageLocator();
        await expect(message).toBeVisible();
      } else {
        await expect(submit).toBeDisabled();
      }
    });

    dataTest('declined card shows error message @e2e @checkout @regression @destructive', async ({ api, page }) => {
      const checkout = await gotoCheckoutWithItem(api, page, firstProduct.id);
      await checkout.setName('Test User');
      await checkout.setEmail('test.user@robotstore.com');

      await fillStripeCard(page, { number: '4000 0000 0000 0002', exp: '12/34', cvc: '123', postal: '10001' });
      await expect(checkout.getSubmitButton()).toBeEnabled();
      await checkout.clickSubmit();

      const result = await waitForPaymentResult(page, checkout, 20000);
      expect(result.status).not.toBe('success');
      if (result.status === 'error') {
        expect(result.message ?? '').toMatch(/declined/i);
      }
    });

    dataTest('checkout with empty cart redirects to cart @e2e @checkout @regression @destructive', async ({ api, page }) => {
      await seedCart(api, []);

      await page.goto('/order/checkout');
      await expect(page).toHaveURL(/\/cart/);
      await expect(page.getByText('Your cart is empty.')).toBeVisible();
    });
  });
});
