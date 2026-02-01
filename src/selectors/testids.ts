// รวม helpers สร้าง data-testid เพื่อให้เรียกซ้ำง่าย

// --- Auth ---

export const testIdAuth = {
    loginUsername: 'login-username',
    loginPassword: 'login-password',
    loginSubmit: 'login-submit',
    registerUsername: 'register-username',
    registerEmail: 'register-email',
    registerPassword: 'register-password',
    registerConfirm: 'register-confirm-password',
    registerSubmit: 'register-submit'
} as const;

// --- Navbar / Header ---
export const testIdNav = {
    cartLink: 'nav-cart-link',
    cartCount: 'nav-cart-count',
    bell: 'nav-bell',
    accountMenu: 'nav-account-menu',
    profile: 'nav-profile',
    logout: 'logout-link'
} as const;

// --- Product / Catalog ---
export const testIdProduct = {
    // dynamic card ในหน้า catalog
    card: (id: number | string) => `product-card-${id}`,
    titleInCard: (id: number | string) => `product-title-${id}`,
    priceInCard: (id: number | string) => `product-price-${id}`,

    // หน้า product detail
    detailTitle: 'product-title',
    detailPrice: 'product-price',
    qtyInput: 'product-qty',
    qtyIncrease: 'product-qty-increase',
    qtyDecrease: 'product-qty-decrease',
    addToCart: 'product-add-to-cart'
};

// --- Cart ---
export const testIdCart = {
  itemRow: (id: number | string) => `cart-item-${id}`,
  itemName: (id: number | string) => `cart-item-name-${id}`,
  itemPrice: (id: number | string) => `cart-item-price-${id}`,
  itemTotal: (id: number | string) => `cart-item-total-${id}`,
  qtyIncrease: (id: number | string) => `cart-qty-increase-${id}`,
  qtyDecrease: (id: number | string) => `cart-qty-decrease-${id}`,
  qtyValue: (id: number | string) => `cart-qty-value-${id}`,
  removeItem: (id: number | string) => `cart-remove-${id}`,

  subtotal: 'cart-subtotal',
  discount: 'cart-discount',
  shipping: 'cart-shipping',
  grandTotal: 'cart-grand-total',

  couponInput: 'cart-coupon-input',
  applyCoupon: 'cart-apply-coupon',
  removeCoupon: 'cart-remove-coupon',
  clearCart: 'cart-clear',
  checkout: 'cart-checkout'
};

// --- Checkout ---
export const testIdCheckout = {
  total: 'checkout-total',
  form: 'checkout-form',
  name: 'checkout-name',
  email: 'checkout-email',
  submit: 'checkout-submit',
  paymentElement: 'payment-element',
  paymentMessage: 'payment-message',
  mockNote: 'mock-payment-note'
};

// --- Order Success ---
export const testIdSuccess = {
  message: 'order-success-message',
  orderId: 'order-id'
};

// --- Admin / Notifications ---
export const testIdAdmin = {
  orderRow: (orderId: string) => `order-row-${orderId}`,
  notifItem: (orderId: string) => `notif-item-${orderId}`
};

// --- Chaos ---
export const testIdChaos = {
  widget: 'chaos-widget',
  save: 'save-chaos-btn'
};
