import { test, expect, loginAndSyncSession, seedCart } from '@fixtures';
import { SHIPPING } from '@config';
import { seededProducts, coupons, uiMessages } from '@data';


test.describe('cart @e2e @cart', () => {
  test.use({ seedData: true });
  const firstProduct = seededProducts[0];
  const secondProduct = seededProducts[1];

  test.beforeEach(async ({ api, page }) => {
    await loginAndSyncSession(api, page);
  });

  test.describe('positive cases', () => {
    test('add first product to cart @smoke @e2e @cart @destructive', async ({ api, page, homePage, productPage, cartPage }) => {
      await seedCart(api, []);

      await homePage.goto();
      await homePage.clickProductById(firstProduct.id);
      await productPage.addToCart();

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

    test('add second product and verify subtotal @e2e @cart @regression @destructive', async ({ api, homePage, productPage, cartPage }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      await homePage.goto();
      await homePage.clickProductById(secondProduct.id);
      await productPage.addToCart();

      await cartPage.goto();
      expect(await cartPage.isItemVisible(secondProduct.id)).toBe(true);
      expect(await cartPage.getItemName(secondProduct.id)).toContain(secondProduct.name);
      expect(await cartPage.getItemPriceValue(secondProduct.id)).toBeCloseTo(secondProduct.price, 2);

      const subtotal = await cartPage.getSubtotalValue();
      const expectedSubtotal = firstProduct.price + secondProduct.price;
      expect(subtotal).toBeCloseTo(expectedSubtotal, 2);
      expect(await cartPage.getCartCount()).toBe(2);

      const shippingValue = await cartPage.getShippingValue();
      expect(shippingValue).toBe(SHIPPING.fee);
    });

    test('increase quantity updates totals and enables free shipping @e2e @cart @regression @destructive', async ({ api, cartPage }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      await cartPage.goto();
      const beforeQty = await cartPage.getItemQuantity(firstProduct.id);

      await cartPage.increaseQtyById(firstProduct.id);

      const afterQty = await cartPage.getItemQuantity(firstProduct.id);
      expect(afterQty).toBe(beforeQty + 1);

      const rowTotal = await cartPage.getItemTotalValue(firstProduct.id);
      expect(rowTotal).toBeCloseTo(firstProduct.price * afterQty, 2);

      const subtotal = await cartPage.getSubtotalValue();
      const expectedSubtotal = firstProduct.price * afterQty + secondProduct.price;
      expect(subtotal).toBeCloseTo(expectedSubtotal, 2);

      const shippingValue = await cartPage.getShippingValue();
      expect(shippingValue).toBe(0);
    });

    test('apply coupon reduces grand total @e2e @cart @regression @destructive', async ({ api, cartPage }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      await cartPage.goto();
      const subtotal = await cartPage.getSubtotalValue();

      await cartPage.applyCoupon(coupons.robot99.code);

      const discountValue = await cartPage.getDiscountValue();
      expect(discountValue).toBeGreaterThan(0);
      expect(discountValue).toBeCloseTo(subtotal * (coupons.robot99.discountPercent / 100), 1);

      const shippingValue = await cartPage.getShippingValue();
      const grandTotal = await cartPage.getGrandTotalValue();

      const expectedTotal = subtotal - discountValue + shippingValue;
      expect(grandTotal).toBeCloseTo(expectedTotal, 1);
    });

    test('remove coupon restores totals @e2e @cart @regression @destructive', async ({ api, cartPage }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      await cartPage.goto();
      await cartPage.applyCoupon(coupons.robot99.code);
      await cartPage.removeCoupon();

      const discountVisible = await cartPage.isDiscountVisible();
      expect(discountVisible).toBe(false);

      const subtotal = await cartPage.getSubtotalValue();
      const shippingValue = await cartPage.getShippingValue();
      const grandTotal = await cartPage.getGrandTotalValue();
      expect(grandTotal).toBeCloseTo(subtotal + shippingValue, 2);
    });

    test('remove second product updates cart @e2e @cart @regression @destructive', async ({ api, cartPage }) => {
      await seedCart(api, [{ id: firstProduct.id }, { id: secondProduct.id }]);

      await cartPage.goto();
      await cartPage.removeItemById(secondProduct.id);

      expect(await cartPage.isItemVisible(secondProduct.id)).toBe(false);

      const qty = await cartPage.getItemQuantity(firstProduct.id);
      const subtotal = await cartPage.getSubtotalValue();
      expect(subtotal).toBeCloseTo(firstProduct.price * qty, 2);
      expect(await cartPage.getCartCount()).toBe(qty);
    });
  });

  test.describe('negative cases', () => {
    test('expired coupon shows error @e2e @cart @regression @destructive', async ({ api, page, cartPage }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();
      await cartPage.applyCoupon(coupons.expired50.code);

      const error = page.locator('.alert-error');
      await expect(error).toBeVisible();
      await expect(error).toContainText(uiMessages.couponExpired);
    });

    test('cannot decrease quantity below 1 @e2e @cart @regression @destructive', async ({ api, cartPage }) => {
      await seedCart(api, [{ id: firstProduct.id }]);

      await cartPage.goto();

      await cartPage.decreaseQtyById(firstProduct.id);
      const after = await cartPage.getItemQuantity(firstProduct.id);
      expect(after).toBe(1);
    });
  });

  test('clear cart empties cart @e2e @cart @regression @destructive', async ({ api, page, cartPage }) => {
    await seedCart(api, [{ id: firstProduct.id }]);

    await cartPage.goto();
    await cartPage.clearCart();

    expect(await cartPage.getItemCount()).toBe(0);
    expect(await cartPage.getCartCount()).toBe(0);
    await expect(page.getByText(uiMessages.cartEmpty)).toBeVisible();
  });
});
