import type { APIRequestContext } from '@playwright/test';
import { routes } from '@config';

export type OrderCreateResponseBody = {
  status?: 'success' | 'error';
  orderId?: string;
  message?: string;
  error?: {
    message?: string;
  };
};

type OrderCreateResult = {
  status: number;
  body: OrderCreateResponseBody;
};

const postOrder = async (
  api: APIRequestContext,
  route: string
): Promise<OrderCreateResult> => {
  const res = await api.post(route, {
    data: { items: [] },
    headers: { Accept: 'application/json' },
    maxRedirects: 0
  });

  const body = (await res.json().catch(() => ({}))) as OrderCreateResponseBody;
  return { status: res.status(), body };
};

const getOrderErrorMessage = (body: OrderCreateResponseBody): string => {
  if (typeof body.message === 'string') return body.message;
  if (typeof body.error?.message === 'string') return body.error.message;
  return '';
};

// Use Stripe endpoint first, then fallback to mock endpoint when Stripe is disabled.
export const createOrderWithProviderFallback = async (
  api: APIRequestContext
): Promise<OrderCreateResult> => {
  const stripeAttempt = await postOrder(api, routes.api.orderCreate);

  if (stripeAttempt.status !== 400) {
    return stripeAttempt;
  }

  const errorMessage = getOrderErrorMessage(stripeAttempt.body).toLowerCase();
  if (!errorMessage.includes('stripe payments are disabled')) {
    return stripeAttempt;
  }

  return await postOrder(api, routes.api.orderMockPay);
};
