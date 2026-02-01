// รวม helper ที่ใช้ role/name selectors
// เน้นความทนทานกับ UI เปลี่ยนเล็กน้อย (text/role)

export const roleNav = {
  storeLinkName: 'Store',
  qaToolsName: 'QA Tools',
  apiDocsName: 'API Docs',
  chaosLabName: 'Chaos Lab',
  qaGuideName: 'QA Guide'
} as const;

export const roleButtons = {
  login: 'Sign In',
  register: 'Create Account',
  addToCart: 'Add to Cart',
  proceedToCheckout: 'Proceed to Checkout',
  completeOrder: 'Complete Order'
} as const;

// ข้อความที่ใช้เป็น heading
export const roleHeadings = {
  cart: 'Your Shopping Cart',
  checkout: 'Secure Checkout'
} as const;
