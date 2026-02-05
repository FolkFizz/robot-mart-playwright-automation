import { APIRequestContext, expect } from '@playwright/test';
import { routes } from '@config/constants';

// เพิ่มสินค้าเข้าตะกร้า (JSON)
export const addToCart = async (
  ctx: APIRequestContext,
  productId: number,
  quantity = 1
) => {
  const res = await ctx.post(routes.api.cartAdd, {
    data: { productId, quantity },
    headers: { Accept: 'application/json' }
  });

  expect(res.ok()).toBeTruthy();
  return res;
};

// อัปเดตจำนวนสินค้าในตะกร้า
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

// ลบสินค้าจากตะกร้า
export const removeCartItem = async (
  ctx: APIRequestContext,
  productId: number
) => {
  const res = await ctx.post(routes.api.cartRemove, {
    data: { productId },
    headers: { Accept: 'application/json' }
  });

  expect(res.ok()).toBeTruthy();
  return res;
};

// ดึง cart summary
export const getCart = async (ctx: APIRequestContext) => {
  const res = await ctx.get(routes.api.cart, {
    headers: { Accept: 'application/json' }
  });
  expect(res.ok()).toBeTruthy();
  return res;
};

// ล้างตะกร้าทั้งหมด
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

// ใช้คูปอง
export const applyCoupon = async (ctx: APIRequestContext, code: string) => {
  const res = await ctx.post(routes.api.cartCoupons, {
    data: { code },
    headers: { Accept: 'application/json' }
  });
  expect(res.ok()).toBeTruthy();
  return res;
};

// เอาคูปองออก
export const removeCoupon = async (ctx: APIRequestContext) => {
  const res = await ctx.delete(routes.api.cartCoupons, {
    headers: { Accept: 'application/json' }
  });
  expect(res.ok()).toBeTruthy();
  return res;
};
