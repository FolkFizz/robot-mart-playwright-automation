import { test, expect, loginAndSyncSession, seedCart } from '@fixtures/base.fixture';

import { HomePage } from '@pages/home.page';
import { ProductPage } from '@pages/product.page';
import { CartPage } from '@pages/cart.page';

import { SHIPPING } from '@config/constants';
import { seededProducts } from '@data/catalog';
import { coupons } from '@data/checkout';
import { uiMessages } from '@data/messages';

test.describe('cart @e2e @cart', () => {
  test.use({ seedData: true });
  const firstProduct = seededProducts[0];
  const secondProduct = seededProducts[1];

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
  });

  test.describe('positive cases', () => {
    test('add first product to cart @smoke @e2e @cart @destructive', async ({ api, page }) => {
      await seedCart(api, []);

      const home = new HomePage(page);
      const product = new ProductPage(page);
      const cart = new CartPage(page);

      await home.goto();
      await home.clickProductById(firstProduct.id);
      await product.addToCart();

      await cart.goto();
      expect(await cart.isItemVisible(firstProduct.id)).toBe(true);
      expect(await cart.getItemName(firstProduct.id)).toContain(firstProduct.name);
      expect(await cart.getItemPriceValue(firstProduct.id)).toBeCloseTo(firstProduct.price, 2);
      expect(await cart.getItemQuantity(firstProduct.id)).toBe(1);
      expect(await cart.getItemTotalValue(firstProduct.id)).toBeCloseTo(firstProduct.price, 2);

      const subtotal = await cart.getSubtotalValue();
      expect(subtotal).toBeCloseTo(firstProduct.price, 2);
      expect(await cart.getCartCount()).toBe(1);
    });

    test('add second product and verify subtotal @e2e @cart @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      const home = new HomePage(page);
      const product = new ProductPage(page);
      const cart = new CartPage(page);

      await home.goto();
      await home.clickProductById(secondProduct.id);
      await product.addToCart();

      await cart.goto();
      expect(await cart.isItemVisible(secondProduct.id)).toBe(true);
      expect(await cart.getItemName(secondProduct.id)).toContain(secondProduct.name);
      expect(await cart.getItemPriceValue(secondProduct.id)).toBeCloseTo(secondProduct.price, 2);

      const subtotal = await cart.getSubtotalValue();
      const expectedSubtotal = firstProduct.price + secondProduct.price;
      expect(subtotal).toBeCloseTo(expectedSubtotal, 2);
      expect(await cart.getCartCount()).toBe(2);

      const shippingValue = await cart.getShippingValue();
      expect(shippingValue).toBe(SHIPPING.fee);
    });

    test('increase quantity updates totals and enables free shipping @e2e @cart @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      const beforeQty = await cart.getItemQuantity(firstProduct.id);

      await cart.increaseQtyById(firstProduct.id);

      const afterQty = await cart.getItemQuantity(firstProduct.id);
      expect(afterQty).toBe(beforeQty + 1);

      const rowTotal = await cart.getItemTotalValue(firstProduct.id);
      expect(rowTotal).toBeCloseTo(firstProduct.price * afterQty, 2);

      const subtotal = await cart.getSubtotalValue();
      const expectedSubtotal = firstProduct.price * afterQty + secondProduct.price;
      expect(subtotal).toBeCloseTo(expectedSubtotal, 2);

      const shippingValue = await cart.getShippingValue();
      expect(shippingValue).toBe(0);
    });

    test('apply coupon reduces grand total @e2e @cart @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      const subtotal = await cart.getSubtotalValue();

      await cart.applyCoupon(coupons.robot99.code);

      const discountValue = await cart.getDiscountValue();
      expect(discountValue).toBeGreaterThan(0);
      expect(discountValue).toBeCloseTo(subtotal * (coupons.robot99.discountPercent / 100), 1);

      const shippingValue = await cart.getShippingValue();
      const grandTotal = await cart.getGrandTotalValue();

      const expectedTotal = subtotal - discountValue + shippingValue;
      expect(grandTotal).toBeCloseTo(expectedTotal, 1);
    });

    test('remove coupon restores totals @e2e @cart @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      await cart.applyCoupon(coupons.robot99.code);
      await cart.removeCoupon();

      const discountVisible = await cart.isDiscountVisible();
      expect(discountVisible).toBe(false);

      const subtotal = await cart.getSubtotalValue();
      const shippingValue = await cart.getShippingValue();
      const grandTotal = await cart.getGrandTotalValue();
      expect(grandTotal).toBeCloseTo(subtotal + shippingValue, 2);
    });

    test('remove second product updates cart @e2e @cart @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      await cart.removeItemById(secondProduct.id);

      expect(await cart.isItemVisible(secondProduct.id)).toBe(false);

      const qty = await cart.getItemQuantity(firstProduct.id);
      const subtotal = await cart.getSubtotalValue();
      expect(subtotal).toBeCloseTo(firstProduct.price * qty, 2);
      expect(await cart.getCartCount()).toBe(qty);
    });
  });

  test.describe('negative cases', () => {
    test('expired coupon shows error @e2e @cart @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      await cart.applyCoupon(coupons.expired50.code);

      const error = page.locator('.alert-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText(uiMessages.couponExpired);
    });

    test('cannot decrease quantity below 1 @e2e @cart @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();

      await cart.decreaseQtyById(firstProduct.id);
      const after = await cart.getItemQuantity(firstProduct.id);
      expect(after).toBe(1);
    });
  });

  test('clear cart empties cart @e2e @cart @regression @destructive', async ({ api, page }) => {
    await seedCart(api, [{ id: firstProduct.id }]);

    const cart = new CartPage(page);

    await cart.goto();
    await cart.clearCart();

    expect(await cart.getItemCount()).toBe(0);
    expect(await cart.getCartCount()).toBe(0);
    await expect(page.getByText(uiMessages.cartEmpty)).toBeVisible();
  });
});
