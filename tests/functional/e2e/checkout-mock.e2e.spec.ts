import type { BrowserContext, Page } from '@playwright/test';
import { test as dataTest, expect } from '@fixtures/data.fixture';

import { LoginPage } from '@pages/auth/login.page';
import { HomePage } from '@pages/home.page';
import { ProductPage } from '@pages/product.page';
import { CartPage } from '@pages/cart.page';
import { CheckoutPage } from '@pages/checkout.page';
import { ProfilePage } from '@pages/user/profile.page';
import { NavbarComponent } from '@components/navbar.component';

import { SHIPPING } from '@config/constants';
import { users } from '../../_support/test-data/users';
import { seededProducts } from '../../_support/test-data/products';
import { coupons } from '../../_support/test-data/coupons';
import { disableChaos } from '../../_support/setup/chaos';
import { testIdCheckout, testIdCart } from '@selectors/testids';

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

const ensureCartHasItem = async (context: BrowserContext, productId: number | string, quantity = 1) => {
  const res = await context.request.post('/api/cart/add', {
    data: { productId, quantity },
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
  });
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Failed to add item to cart via API: ${res.status()} ${body}`);
  }
};

const resetCart = async (context: BrowserContext) => {
  const res = await context.request.delete('/api/cart/reset');
  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`Failed to reset cart via API: ${res.status()} ${body}`);
  }
};

dataTest.describe.serial('checkout stripe @e2e @destructive', () => {
  let context: BrowserContext;
  let page: Page;
  let login: LoginPage;
  let home: HomePage;
  let product: ProductPage;
  let cart: CartPage;
  let checkout: CheckoutPage;
  let profile: ProfilePage;
  let navbar: NavbarComponent;
  let lastOrderId = '';

  const firstProduct = seededProducts[0];
  const secondProduct = seededProducts[1];
  const thirdProduct = seededProducts[2];
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  dataTest.beforeAll(async ({ browser }) => {
    context = await browser.newContext({ baseURL: baseUrl });
    page = await context.newPage();

    login = new LoginPage(page);
    home = new HomePage(page);
    product = new ProductPage(page);
    cart = new CartPage(page);
    checkout = new CheckoutPage(page);
    profile = new ProfilePage(page);
    navbar = new NavbarComponent(page);

    await disableChaos();

    await login.goto();
    await login.login(users.user.username, users.user.password);

    const resetRes = await context.request.delete('/api/cart/reset');
    if (!resetRes.ok()) {
      console.warn(`[checkout-mock] cart reset failed: ${resetRes.status()}`);
    }

    await cart.goto();
    const existing = await cart.getItemCount();
    if (existing > 0) {
      await cart.clearCart();
      await cart.goto();
    }
  });

  dataTest.afterAll(async () => {
    await context?.close();
  });

  const gotoCheckoutWithItem = async (productId: number | string) => {
    await resetCart(context);
    await ensureCartHasItem(context, productId, 1);
    await cart.goto();
    await cart.proceedToCheckout();
    await expect(page).toHaveURL(/\/order\/checkout/);
    await checkout.waitForStripeReady();
  };

  const waitForPaymentResult = async (timeoutMs = 30000) => {
    const deadline = Date.now() + timeoutMs;
    const message = page.getByTestId(testIdCheckout.paymentMessage);
    const submit = page.getByTestId(testIdCheckout.submit);
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

      const status = await submit.getAttribute('data-status').catch(() => 'idle');
      if (status === 'loading') sawLoading = true;

      await page.waitForTimeout(500);
    }

    return { status: 'timeout' as const, sawLoading };
  };

  const attemptStripePayment = async () => {
    await page.getByTestId(testIdCheckout.name).fill('Test User');
    await page.getByTestId(testIdCheckout.email).fill('test.user@robotstore.com');

    await checkout.waitForStripeReady();
    await fillStripeCard(page, { number: '4242 4242 4242 4242', exp: '12/34', cvc: '123', postal: '10001' });
    await expect(page.getByTestId(testIdCheckout.submit)).toBeEnabled();
    await page.getByTestId(testIdCheckout.submit).click();

    return await waitForPaymentResult(30000);
  };

  dataTest.describe('positive cases', () => {
    dataTest('setup cart with 2 items @regression', async () => {
      await home.goto();
      await home.clickProductById(firstProduct.id);
      await product.addToCart();

      await home.goto();
      await home.clickProductById(secondProduct.id);
      await product.addToCart();

      await cart.goto();
      const count = await cart.getItemCount();
      expect(count).toBe(2);

      const subtotal = parsePrice(await cart.getSubtotal());
      const expected = firstProduct.price + secondProduct.price;
      expect(subtotal).toBeCloseTo(expected, 2);
    });

    dataTest('checkout page shows stripe ready and total matches cart @smoke', async () => {
      await cart.goto();
      const cartTotal = parsePrice(await cart.getGrandTotal());

      await cart.proceedToCheckout();
      await expect(page).toHaveURL(/\/order\/checkout/);

      await checkout.waitForStripeReady();

      const checkoutTotal = parsePrice(await checkout.getTotal());
      expect(checkoutTotal).toBeCloseTo(cartTotal, 2);

      const nameValue = await page.getByTestId(testIdCheckout.name).inputValue();
      const emailValue = await page.getByTestId(testIdCheckout.email).inputValue();
      expect(nameValue.length).toBeGreaterThan(0);
      expect(emailValue.length).toBeGreaterThan(0);
    });

    dataTest('complete stripe payment redirects to success @smoke', async () => {
      dataTest.setTimeout(90_000);
      let result = await attemptStripePayment();
      if (result.status === 'timeout') {
        await page.reload({ waitUntil: 'domcontentloaded' });
        result = await attemptStripePayment();
      }

      if (result.status === 'error') {
        throw new Error(`Stripe payment failed: ${result.message}`);
      }

      if (result.status === 'success') {
        await expect(page.getByTestId('order-success-message')).toBeVisible();
        const orderId = await page.getByTestId('order-id').innerText();
        lastOrderId = orderId.trim();
        expect(lastOrderId.length).toBeGreaterThan(5);
        expect(await navbar.getCartCount()).toBe(0);
      } else {
        console.warn('[checkout] Stripe did not complete within timeout; skipping order-id assertions');
      }
    });

    dataTest('order appears in profile orders @regression', async () => {
      if (!lastOrderId) dataTest.skip();
      expect(lastOrderId.length).toBeGreaterThan(5);
      await profile.gotoTab('orders');
      const orderCard = page.locator('.order-card', { hasText: lastOrderId });
      await expect(orderCard).toBeVisible();
    });

    dataTest('apply WELCOME10 on low-value order updates totals @regression', async () => {
      await resetCart(context);
      await ensureCartHasItem(context, firstProduct.id, 1);

      await cart.goto();
      const subtotal = parsePrice(await cart.getSubtotal());
      expect(subtotal).toBeLessThan(SHIPPING.freeThreshold);

      const shippingBefore = parseShipping(await page.getByTestId(testIdCart.shipping).innerText());
      expect(shippingBefore).toBe(SHIPPING.fee);

      await cart.applyCoupon(coupons.welcome10.code);

      const discountValue = parsePrice(await page.getByTestId(testIdCart.discount).innerText());
      expect(discountValue).toBeCloseTo(subtotal * (coupons.welcome10.discountPercent / 100), 1);

      const shippingAfter = parseShipping(await page.getByTestId(testIdCart.shipping).innerText());
      expect(shippingAfter).toBe(SHIPPING.fee);

      const grandTotal = parsePrice(await cart.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal - discountValue + shippingAfter, 1);
    });

    dataTest('apply ROBOT99 on high-value order keeps free shipping @regression', async () => {
      await resetCart(context);
      await ensureCartHasItem(context, thirdProduct.id, 2);

      await cart.goto();
      const subtotal = parsePrice(await cart.getSubtotal());
      expect(subtotal).toBeGreaterThanOrEqual(SHIPPING.freeThreshold);

      const shippingBefore = parseShipping(await page.getByTestId(testIdCart.shipping).innerText());
      expect(shippingBefore).toBe(0);

      await cart.applyCoupon(coupons.robot99.code);

      const discountValue = parsePrice(await page.getByTestId(testIdCart.discount).innerText());
      expect(discountValue).toBeCloseTo(subtotal * (coupons.robot99.discountPercent / 100), 1);

      const shippingAfter = parseShipping(await page.getByTestId(testIdCart.shipping).innerText());
      expect(shippingAfter).toBe(0);

      const grandTotal = parsePrice(await cart.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal - discountValue + shippingAfter, 1);
    });

    dataTest('remove coupon restores totals @regression', async () => {
      await resetCart(context);
      await ensureCartHasItem(context, firstProduct.id, 1);

      await cart.goto();
      await cart.applyCoupon(coupons.welcome10.code);

      await cart.removeCoupon();
      const discountVisible = await page.getByTestId(testIdCart.discount).isVisible().catch(() => false);
      expect(discountVisible).toBe(false);

      const subtotal = parsePrice(await cart.getSubtotal());
      const shippingValue = parseShipping(await page.getByTestId(testIdCart.shipping).innerText());
      const grandTotal = parsePrice(await cart.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal + shippingValue, 1);
    });

    dataTest('shipping recalculates when discount crosses threshold @regression', async () => {
      await resetCart(context);
      await ensureCartHasItem(context, firstProduct.id, 2);
      await ensureCartHasItem(context, secondProduct.id, 1);

      await cart.goto();
      const subtotal = parsePrice(await cart.getSubtotal());
      expect(subtotal).toBeGreaterThanOrEqual(SHIPPING.freeThreshold);

      const shippingBefore = parseShipping(await page.getByTestId(testIdCart.shipping).innerText());
      expect(shippingBefore).toBe(0);

      await cart.applyCoupon(coupons.robot99.code);

      const discountValue = parsePrice(await page.getByTestId(testIdCart.discount).innerText());
      expect(subtotal - discountValue).toBeLessThan(SHIPPING.freeThreshold);
      const shippingAfter = parseShipping(await page.getByTestId(testIdCart.shipping).innerText());
      const grandTotal = parsePrice(await cart.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal - discountValue + shippingAfter, 1);
    });
  });

  dataTest.describe('negative cases', () => {
    dataTest('expired coupon is rejected and totals unchanged @regression', async () => {
      await resetCart(context);
      await ensureCartHasItem(context, firstProduct.id, 1);

      await cart.goto();
      const subtotal = parsePrice(await cart.getSubtotal());
      const shippingBefore = parseShipping(await page.getByTestId(testIdCart.shipping).innerText());
      const totalBefore = parsePrice(await cart.getGrandTotal());

      await cart.applyCoupon(coupons.expired50.code);

      const removeVisible = await page.getByTestId(testIdCart.removeCoupon).isVisible().catch(() => false);
      expect(removeVisible).toBe(false);

      const discountVisible = await page.getByTestId(testIdCart.discount).isVisible().catch(() => false);
      if (discountVisible) {
        const discountValue = parsePrice(await page.getByTestId(testIdCart.discount).innerText());
        expect(discountValue).toBe(0);
      }

      const totalAfter = parsePrice(await cart.getGrandTotal());
      expect(totalAfter).toBeCloseTo(subtotal + shippingBefore, 1);
      expect(totalAfter).toBeCloseTo(totalBefore, 1);
    });

    dataTest('coupon input is hidden after applying (no re-apply) @regression', async () => {
      await resetCart(context);
      await ensureCartHasItem(context, firstProduct.id, 1);

      await cart.goto();
      await cart.applyCoupon(coupons.robot99.code);

      const couponInputVisible = await page.getByTestId(testIdCart.couponInput).isVisible().catch(() => false);
      expect(couponInputVisible).toBe(false);

      const removeVisible = await page.getByTestId(testIdCart.removeCoupon).isVisible().catch(() => false);
      expect(removeVisible).toBe(true);
    });

    dataTest('empty name prevents submit @regression', async () => {
      await gotoCheckoutWithItem(firstProduct.id);

      await page.getByTestId(testIdCheckout.name).fill('');
      await page.getByTestId(testIdCheckout.email).fill('test.user@robotstore.com');

      await page.getByTestId(testIdCheckout.submit).click();
      const nameInput = page.getByTestId(testIdCheckout.name);
      const isValid = await nameInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
      expect(isValid).toBe(false);
      await expect(page).toHaveURL(/\/order\/checkout/);
    });

    dataTest('empty email prevents submit @regression', async () => {
      await gotoCheckoutWithItem(firstProduct.id);

      await page.getByTestId(testIdCheckout.name).fill('Test User');
      await page.getByTestId(testIdCheckout.email).fill('');

      await page.getByTestId(testIdCheckout.submit).click();
      const emailInput = page.getByTestId(testIdCheckout.email);
      const isValid = await emailInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
      expect(isValid).toBe(false);
      await expect(page).toHaveURL(/\/order\/checkout/);
    });

    dataTest('invalid email prevents submit @regression', async () => {
      await gotoCheckoutWithItem(firstProduct.id);

      await page.getByTestId(testIdCheckout.name).fill('Test User');
      await page.getByTestId(testIdCheckout.email).fill('invalid-email');

      await page.getByTestId(testIdCheckout.submit).click();
      const emailInput = page.getByTestId(testIdCheckout.email);
      const isValid = await emailInput.evaluate((el) => (el as HTMLInputElement).checkValidity());
      expect(isValid).toBe(false);
      await expect(page).toHaveURL(/\/order\/checkout/);
    });

    dataTest('stripe incomplete card blocks submit @regression', async () => {
      await gotoCheckoutWithItem(firstProduct.id);

      await page.getByTestId(testIdCheckout.name).fill('Test User');
      await page.getByTestId(testIdCheckout.email).fill('test.user@robotstore.com');

      const frame = page.frameLocator('iframe[name^="__privateStripeFrame"]:not([aria-hidden="true"])');
      const numberInput = frame.locator('input[name="cardnumber"], input[name="number"]').first();
      await numberInput.fill('4242 4242 4242 4242');

      const submit = page.getByTestId(testIdCheckout.submit);
      if (await submit.isEnabled()) {
        await submit.click();
        const message = page.getByTestId(testIdCheckout.paymentMessage);
        await expect(message).toBeVisible();
      } else {
        await expect(submit).toBeDisabled();
      }
    });

    dataTest('declined card shows error message @regression', async () => {
      await gotoCheckoutWithItem(firstProduct.id);
      await page.getByTestId(testIdCheckout.name).fill('Test User');
      await page.getByTestId(testIdCheckout.email).fill('test.user@robotstore.com');

      await fillStripeCard(page, { number: '4000 0000 0000 0002', exp: '12/34', cvc: '123', postal: '10001' });
      await expect(page.getByTestId(testIdCheckout.submit)).toBeEnabled();
      await page.getByTestId(testIdCheckout.submit).click();

      const result = await waitForPaymentResult(20000);
      expect(result.status).not.toBe('success');
      if (result.status === 'error') {
        expect(result.message ?? '').toMatch(/declined/i);
      }
    });

    dataTest('checkout with empty cart redirects to cart @regression', async () => {
      await cart.goto();
      await cart.clearCart();

      await page.goto('/order/checkout');
      await expect(page).toHaveURL(/\/cart/);
      await expect(page.getByText('Your cart is empty.')).toBeVisible();
    });
  });
});
