import type { APIRequestContext, Page } from '@playwright/test';
import { test as dataTest, expect } from '@fixtures/data.fixture';

import { HomePage } from '@pages/home.page';
import { ProductPage } from '@pages/product.page';
import { CartPage } from '@pages/cart.page';
import { NavbarComponent } from '@components/navbar.component';
import { CartItemRowComponent } from '@components/cart-item-row.component';

import { loginAsUser } from '@api/auth.api';
import { addToCart, clearCart } from '@api/cart.api';
import { seededProducts } from '@data/products';
import { coupons } from '@data/coupons';

const parsePrice = (text: string) => Number.parseFloat(text.replace(/[^0-9.]/g, ''));

const parseShipping = (text: string) => {
  if (text.trim().toUpperCase() === 'FREE') return 0;
  return parsePrice(text);
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

dataTest.describe('cart @e2e @cart', () => {
  const firstProduct = seededProducts[0];
  const secondProduct = seededProducts[1];

  dataTest.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
  });

  dataTest.describe('positive cases', () => {
    dataTest('add first product to cart @smoke @e2e @cart @destructive', async ({ api, page }) => {
      await seedCart(api, []);

      const home = new HomePage(page);
      const product = new ProductPage(page);
      const cart = new CartPage(page);
      const navbar = new NavbarComponent(page);

      await home.goto();
      await home.clickProductById(firstProduct.id);
      await product.addToCart();

      await cart.goto();
      const row = new CartItemRowComponent(page, firstProduct.id);
      expect(await row.isVisible()).toBe(true);
      expect(await row.getName()).toContain(firstProduct.name);
      expect(parsePrice(await row.getPrice())).toBeCloseTo(firstProduct.price, 2);
      expect(await row.getQuantity()).toBe(1);
      expect(parsePrice(await row.getTotal())).toBeCloseTo(firstProduct.price, 2);

      const subtotal = parsePrice(await cart.getSubtotal());
      expect(subtotal).toBeCloseTo(firstProduct.price, 2);
      expect(await navbar.getCartCount()).toBe(1);
    });

    dataTest('add second product and verify subtotal @e2e @cart @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      const home = new HomePage(page);
      const product = new ProductPage(page);
      const cart = new CartPage(page);
      const navbar = new NavbarComponent(page);

      await home.goto();
      await home.clickProductById(secondProduct.id);
      await product.addToCart();

      await cart.goto();
      const row = new CartItemRowComponent(page, secondProduct.id);
      expect(await row.isVisible()).toBe(true);
      expect(await row.getName()).toContain(secondProduct.name);
      expect(parsePrice(await row.getPrice())).toBeCloseTo(secondProduct.price, 2);

      const subtotal = parsePrice(await cart.getSubtotal());
      const expectedSubtotal = firstProduct.price + secondProduct.price;
      expect(subtotal).toBeCloseTo(expectedSubtotal, 2);
      expect(await navbar.getCartCount()).toBe(2);

      const shippingText = await cart.getShippingText();
      expect(parseShipping(shippingText)).toBe(50);
    });

    dataTest('increase quantity updates totals and enables free shipping @e2e @cart @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      const row = new CartItemRowComponent(page, firstProduct.id);
      const beforeQty = await row.getQuantity();

      await cart.increaseQtyById(firstProduct.id);

      const afterQty = await row.getQuantity();
      expect(afterQty).toBe(beforeQty + 1);

      const rowTotal = parsePrice(await row.getTotal());
      expect(rowTotal).toBeCloseTo(firstProduct.price * afterQty, 2);

      const subtotal = parsePrice(await cart.getSubtotal());
      const expectedSubtotal = firstProduct.price * afterQty + secondProduct.price;
      expect(subtotal).toBeCloseTo(expectedSubtotal, 2);

      const shippingText = await cart.getShippingText();
      expect(shippingText.trim().toUpperCase()).toBe('FREE');
    });

    dataTest('apply coupon reduces grand total @e2e @cart @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      const subtotal = parsePrice(await cart.getSubtotal());

      await cart.applyCoupon(coupons.robot99.code);

      const discountText = await cart.getDiscountText();
      const discountValue = parsePrice(discountText);
      expect(discountValue).toBeGreaterThan(0);
      expect(discountValue).toBeCloseTo(subtotal * (coupons.robot99.discountPercent / 100), 1);

      const shippingText = await cart.getShippingText();
      const shippingValue = parseShipping(shippingText);
      const grandTotal = parsePrice(await cart.getGrandTotal());

      const expectedTotal = subtotal - discountValue + shippingValue;
      expect(grandTotal).toBeCloseTo(expectedTotal, 1);
    });

    dataTest('remove coupon restores totals @e2e @cart @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      await cart.applyCoupon(coupons.robot99.code);
      await cart.removeCoupon();

      const discountVisible = await cart.isDiscountVisible();
      expect(discountVisible).toBe(false);

      const subtotal = parsePrice(await cart.getSubtotal());
      const shippingValue = parseShipping(await cart.getShippingText());
      const grandTotal = parsePrice(await cart.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal + shippingValue, 2);
    });

    dataTest('remove second product updates cart @e2e @cart @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      const cart = new CartPage(page);
      const navbar = new NavbarComponent(page);

      await cart.goto();
      await cart.removeItemById(secondProduct.id);

      const row = new CartItemRowComponent(page, secondProduct.id);
      expect(await row.isVisible()).toBe(false);

      const remaining = new CartItemRowComponent(page, firstProduct.id);
      const qty = await remaining.getQuantity();
      const subtotal = parsePrice(await cart.getSubtotal());
      expect(subtotal).toBeCloseTo(firstProduct.price * qty, 2);
      expect(await navbar.getCartCount()).toBe(qty);
    });
  });

  dataTest.describe('negative cases', () => {
    dataTest('expired coupon shows error @e2e @cart @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      await cart.applyCoupon(coupons.expired50.code);

      const error = page.locator('.alert-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText('Coupon has expired');
    });

    dataTest('cannot decrease quantity below 1 @e2e @cart @regression @destructive', async ({ api, page }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      const cart = new CartPage(page);

      await cart.goto();
      const row = new CartItemRowComponent(page, firstProduct.id);

      await cart.decreaseQtyById(firstProduct.id);
      const after = await row.getQuantity();
      expect(after).toBe(1);
    });
  });

  dataTest('clear cart empties cart @e2e @cart @regression @destructive', async ({ api, page }) => {
    await seedCart(api, [{ id: firstProduct.id }]);

    const cart = new CartPage(page);
    const navbar = new NavbarComponent(page);

    await cart.goto();
    await cart.clearCart();

    expect(await cart.getItemCount()).toBe(0);
    expect(await navbar.getCartCount()).toBe(0);
    await expect(page.getByText('Your cart is empty.')).toBeVisible();
  });
});
