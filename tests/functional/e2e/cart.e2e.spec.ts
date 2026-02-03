import type { BrowserContext, Page } from '@playwright/test';
import { test as dataTest, expect } from '@fixtures/data.fixture';

import { LoginPage } from '@pages/auth/login.page';
import { HomePage } from '@pages/home.page';
import { ProductPage } from '@pages/product.page';
import { CartPage } from '@pages/cart.page';
import { NavbarComponent } from '@components/navbar.component';
import { CartItemRowComponent } from '@components/cart-item-row.component';

import { users } from '../../_support/test-data/users';
import { seededProducts } from '../../_support/test-data/products';
import { coupons } from '../../_support/test-data/coupons';
import { testIdCart } from '@selectors/testids';

const parsePrice = (text: string) => Number.parseFloat(text.replace(/[^0-9.]/g, ''));

const parseShipping = (text: string) => {
  if (text.trim().toUpperCase() === 'FREE') return 0;
  return parsePrice(text);
};

dataTest.describe.serial('cart stateful flow @e2e @destructive', () => {
  let context: BrowserContext;
  let page: Page;
  let login: LoginPage;
  let home: HomePage;
  let product: ProductPage;
  let cart: CartPage;
  let navbar: NavbarComponent;

  const firstProduct = seededProducts[0];
  const secondProduct = seededProducts[1];

  dataTest.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    login = new LoginPage(page);
    home = new HomePage(page);
    product = new ProductPage(page);
    cart = new CartPage(page);
    navbar = new NavbarComponent(page);

    await login.goto();
    await login.login(users.user.username, users.user.password);

    // เคลียร์ cart ให้สะอาดก่อนเริ่ม stateful flow
    await cart.goto();
    const existing = await cart.getItemCount();
    if (existing > 0) {
      await cart.clearCart();
    }
  });

  dataTest.afterAll(async () => {
    await context?.close();
  });

  dataTest.describe('positive cases', () => {
    dataTest('add first product to cart', async () => {
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

    dataTest('add second product and verify subtotal', async () => {
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

      const shippingText = await page.getByTestId(testIdCart.shipping).innerText();
      expect(parseShipping(shippingText)).toBe(50);
    });

    dataTest('increase quantity updates totals and enables free shipping', async () => {
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

      const shippingText = await page.getByTestId(testIdCart.shipping).innerText();
      expect(shippingText.trim().toUpperCase()).toBe('FREE');
    });

    dataTest('apply coupon reduces grand total', async () => {
      await cart.goto();
      const subtotal = parsePrice(await cart.getSubtotal());

      await cart.applyCoupon(coupons.robot99.code);

      const discountText = await page.getByTestId(testIdCart.discount).innerText();
      const discountValue = parsePrice(discountText);
      expect(discountValue).toBeGreaterThan(0);
      expect(discountValue).toBeCloseTo(subtotal * (coupons.robot99.discountPercent / 100), 1);

      const shippingText = await page.getByTestId(testIdCart.shipping).innerText();
      const shippingValue = parseShipping(shippingText);
      const grandTotal = parsePrice(await cart.getGrandTotal());

      const expectedTotal = subtotal - discountValue + shippingValue;
      expect(grandTotal).toBeCloseTo(expectedTotal, 1);
    });

    dataTest('remove coupon restores totals', async () => {
      await cart.goto();
      await cart.removeCoupon();

      const discountVisible = await page.getByTestId(testIdCart.discount).isVisible().catch(() => false);
      expect(discountVisible).toBe(false);

      const subtotal = parsePrice(await cart.getSubtotal());
      const shippingValue = parseShipping(await page.getByTestId(testIdCart.shipping).innerText());
      const grandTotal = parsePrice(await cart.getGrandTotal());
      expect(grandTotal).toBeCloseTo(subtotal + shippingValue, 2);
    });

    dataTest('remove second product updates cart', async () => {
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
    dataTest('invalid coupon shows error', async () => {
      await cart.goto();
      await cart.applyCoupon(coupons.invalid.code);

      const error = page.locator('.alert-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText('Invalid coupon code');
    });

    dataTest('expired coupon shows error', async () => {
      await cart.goto();
      await cart.applyCoupon('EXPIRED50');

      const error = page.locator('.alert-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText('Coupon has expired');
    });

    dataTest('cannot decrease quantity below 1', async () => {
      await cart.goto();
      const row = new CartItemRowComponent(page, firstProduct.id);

      // ลดให้เหลือ 1 ก่อน
      let qty = await row.getQuantity();
      while (qty > 1) {
        await cart.decreaseQtyById(firstProduct.id);
        qty = await row.getQuantity();
      }

      await cart.decreaseQtyById(firstProduct.id);
      const after = await row.getQuantity();
      expect(after).toBe(1);
    });
  });

  dataTest('clear cart at the end', async () => {
    await cart.goto();
    await cart.clearCart();

    expect(await cart.getItemCount()).toBe(0);
    expect(await navbar.getCartCount()).toBe(0);
    await expect(page.getByText('Your cart is empty.')).toBeVisible();
  });
});
