import { APIRequestContext, expect } from '@playwright/test';
import { routes } from '@config/constants';

type CartItemInput = { productId: number; quantity: number };

// Create a Stripe Payment Intent.
export const createPaymentIntent = async (ctx: APIRequestContext, items: CartItemInput[]) => {
  const res = await ctx.post(routes.api.orderCreateIntent, {
    data: { items },
    headers: { Accept: 'application/json' }
  });

  expect(res.ok()).toBeTruthy();
  return res;
};

// Create an order after real Stripe payment.
export const createOrder = async (ctx: APIRequestContext) => {
  const res = await ctx.post(routes.api.orderCreate, {
    data: { items: [] },
    headers: { Accept: 'application/json' }
  });

  expect(res.ok()).toBeTruthy();
  return res;
};

// Submit mock payment (PAYMENT_PROVIDER=mock).
export const mockPay = async (ctx: APIRequestContext) => {
  const res = await ctx.post(routes.api.orderMockPay, {
    data: { items: [] },
    headers: { Accept: 'application/json' }
  });

  expect(res.ok()).toBeTruthy();
  return res;
};
