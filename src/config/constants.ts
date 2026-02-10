import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const toBool = (value: string | undefined, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase());
};

const getEnv = (key: string, fallback: string) => {
  const value = process.env[key];
  return value && value.length > 0 ? value : fallback;
};

const getEnvRequired = (key: string) => {
  const value = process.env[key];
  if (!value || value.length === 0) {
    throw new Error(`Configuration Error: Missing required environment variable '${key}'.`);
  }
  return value;
};

const buildEnv = () => ({
  baseUrl: getEnv('BASE_URL', 'http://localhost:3000'),
  databaseUrl: getEnvRequired('DATABASE_URL'),
  testApiKey: getEnvRequired('TEST_API_KEY'),
  resetKey: getEnvRequired('RESET_KEY'),
  chaosEnabled: toBool(process.env.CHAOS_ENABLED, false),
  user: {
    username: getEnvRequired('USER_USERNAME'),
    password: getEnvRequired('USER_PASSWORD')
  },
  admin: {
    username: getEnvRequired('ADMIN_USERNAME'),
    password: getEnvRequired('ADMIN_PASSWORD')
  }
});

export type Env = ReturnType<typeof buildEnv>;

let envCache: Env | null = null;
export const env: Env = new Proxy({} as Env, {
  get: (_target, prop: string | symbol) => {
    if (!envCache) envCache = buildEnv();
    return envCache[prop as keyof Env];
  }
});

export const routes = {
  home: '/',
  login: '/login',
  logout: '/logout',
  register: '/register',
  forgotPassword: '/forgot-password',
  resetPasswordBase: '/reset-password',
  resetPassword: (token: string) => `/reset-password/${token}`,
  cart: '/cart',
  checkout: '/order/checkout',
  order: {
    checkout: '/order/checkout',
    place: '/order/place',
    invoiceBase: '/order/invoice',
    invoice: (orderId: string) => `/order/invoice/${orderId}`
  },
  orderSuccessBase: '/order/success',
  orderSuccess: (orderId: string) => `/order/success?order_id=${encodeURIComponent(orderId)}`,
  productDetail: (id: number | string) => `/product/${id}`,
  profile: '/profile',
  profileOrders: '/profile?tab=orders',
  claim: '/claim',
  inbox: '/inbox',
  demoInbox: '/demo-inbox',
  chaosLab: '/chaos-lab',
  qaGuide: '/for-testers',
  apiDocs: '/api-docs',
  admin: {
    dashboard: '/admin/dashboard',
    inventory: '/admin/inventory',
    coupons: '/admin/coupons',
    claims: '/admin/claims',
    orders: '/admin/orders'
  },
  api: {
    products: '/api/products',
    productDetail: (id: number | string) => `/api/products/${id}`,
    resetStockSafe: `/api/products/reset-stock`,
    cartAdd: '/api/cart/add',
    cartUpdate: '/api/cart/update',
    cartRemove: '/api/cart/remove',
    cart: '/api/cart',
    cartItem: (id: number | string) => `/api/cart/items/${id}`,
    cartCoupons: '/api/cart/coupons',
    cartReset: '/api/cart/reset',
    orderCreateIntent: '/order/api/create-payment-intent',
    orderCreate: '/order/api/create',
    orderMockPay: '/order/api/mock-pay',
    testReset: '/api/test/reset',
    testSeed: '/api/test/seed',
    testSetStock: '/api/test/set-stock',
    testCreateExpiredResetToken: '/api/test/create-expired-reset-token',
    chaosConfig: '/api/chaos/config',
    chat: '/api/chat',
    notifications: '/notifications/list',
    adminNotifications: '/admin/notifications/list'
  }
} as const;

export const TIMEOUTS = {
  action: 10_000,
  navigation: 30_000,
  expect: 5_000
};

export const SHIPPING = {
  freeThreshold: 1000,
  fee: 50
};

export const COUPONS = {
  valid: ['ROBOT99', 'WELCOME10'],
  expired: 'EXPIRED50'
};

export const TEST_TAGS = {
  functional: '@functional',
  nonFunctional: '@nonfunctional',
  e2e: '@e2e',
  api: '@api',
  integration: '@integration',
  a11y: '@a11y',
  smoke: '@smoke',
  sanity: '@sanity',
  regression: '@regression'
};
