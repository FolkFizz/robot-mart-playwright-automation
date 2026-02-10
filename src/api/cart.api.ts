import { APIRequestContext, expect } from '@playwright/test';
import { routes } from '@config/constants';

// Add an item to the cart (JSON payload).
export const addToCart = async (ctx: APIRequestContext, productId: number, quantity = 1) => {
  const res = await ctx.post(routes.api.cartAdd, {
    data: { productId, quantity },
    headers: { Accept: 'application/json' }
  });

  expect(res.ok()).toBeTruthy();
  return res;
};

// Update item quantity in the cart.
export const updateCartItem = async (
  ctx: APIRequestContext,
  productId: number,
  quantity: number
) => {
  const res = await ctx.post(routes.api.cartUpdate, {
    data: { productId, quantity },
    headers: { Accept: 'application/json' }
  });

  expect(res.ok()).toBeTruthy();
  return res;
};

// Remove an item from the cart.
export const removeCartItem = async (ctx: APIRequestContext, productId: number) => {
  const res = await ctx.post(routes.api.cartRemove, {
    data: { productId },
    headers: { Accept: 'application/json' }
  });

  expect(res.ok()).toBeTruthy();
  return res;
};

// Fetch cart summary.
export const getCart = async (ctx: APIRequestContext) => {
  const res = await ctx.get(routes.api.cart, {
    headers: { Accept: 'application/json' }
  });
  expect(res.ok()).toBeTruthy();
  return res;
};

// Clear the entire cart.
export const clearCart = async (ctx: APIRequestContext) => {
  let res = await ctx.delete(routes.api.cartReset, {
    headers: { Accept: 'application/json' }
  });
  if (!res.ok()) {
    res = await ctx.delete(routes.api.cart, {
      headers: { Accept: 'application/json' }
    });
  }
  expect(res.ok()).toBeTruthy();
  return res;
};

// Apply a coupon.
export const applyCoupon = async (ctx: APIRequestContext, code: string) => {
  const res = await ctx.post(routes.api.cartCoupons, {
    data: { code },
    headers: { Accept: 'application/json' }
  });
  expect(res.ok()).toBeTruthy();
  return res;
};

// Remove an applied coupon.
export const removeCoupon = async (ctx: APIRequestContext) => {
  const res = await ctx.delete(routes.api.cartCoupons, {
    headers: { Accept: 'application/json' }
  });
  expect(res.ok()).toBeTruthy();
  return res;
};
