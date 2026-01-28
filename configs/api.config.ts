export const API_CONFIG = {
  baseURL: process.env.BASE_URL || 'https://robot-store-sandbox.onrender.com',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  endpoints: {
    auth: {
      login: '/login',
      register: '/register',
      logout: '/logout',
      forgotPassword: '/forgot-password',
      resetPassword: '/reset-password',
    },
    products: {
      list: '/',
      detail: '/product/:id',
      search: '/?q=:query',
      category: '/?category=:category',
    },
    cart: {
      view: '/cart',
      add: '/api/cart/add',
      update: '/api/cart/update',
      remove: '/cart/remove/:id',
      clear: '/api/cart/clear',
      applyCoupon: '/cart/coupon',
      removeCoupon: '/cart/coupon/remove',
    },
    order: {
      place: '/order/place',
      history: '/profile',
      invoice: '/invoice/:id',
    },
    admin: {
      dashboard: '/admin/dashboard',
      orders: '/admin/orders',
      coupons: '/admin/coupons',
      inventory: '/admin/inventory',
      claims: '/admin/claims',
    },
  },
};
