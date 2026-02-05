import { test, expect } from '@fixtures/base.fixture';

import { loginAsUser } from '@api/auth.api';
import { addToCart, applyCoupon, clearCart, getCart, removeCartItem, removeCoupon, updateCartItem } from '@api/cart.api';
import { seededProducts } from '@data/products';
import { coupons } from '@data/coupons';

test.describe('cart api @api @cart', () => {
  test.use({ seedData: true });

  test('add update remove cart item @api @cart @regression', async ({ api }) => {
    const product = seededProducts[0];

    await loginAsUser(api);
    await clearCart(api);
    await addToCart(api, product.id, 1);

    let res = await getCart(api);
    let body = await res.json();
    expect(body.ok).toBeTruthy();
    expect(Array.isArray(body.cart)).toBe(true);
    expect(body.cart.some((item: { id: number }) => item.id === product.id)).toBe(true);

    await updateCartItem(api, product.id, 2);
    res = await getCart(api);
    body = await res.json();
    const updated = body.cart.find((item: { id: number }) => item.id === product.id);
    expect(updated?.quantity).toBe(2);

    await removeCartItem(api, product.id);
    res = await getCart(api);
    body = await res.json();
    expect(body.cart.some((item: { id: number }) => item.id === product.id)).toBe(false);
  });

  test('apply and remove coupon @api @cart @regression', async ({ api }) => {
    const product = seededProducts[0];

    await loginAsUser(api);
    await clearCart(api);
    await addToCart(api, product.id, 1);

    const applyRes = await applyCoupon(api, coupons.welcome10.code);
    const applyBody = await applyRes.json();
    expect(applyBody.status).toBe('success');

    const removeRes = await removeCoupon(api);
    const removeBody = await removeRes.json();
    expect(removeBody.status).toBe('success');
  });
});
