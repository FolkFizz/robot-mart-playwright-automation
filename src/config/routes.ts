// แผนที่เส้นทางทั้งหมด

export const routes = {
    // Web pages
    home: '/',
    login: '/login',
    register: '/register',
    cart: '/cart',
    checkout: '/order/checkout',
    orderSuccess: (orderId: string) => `/order/success?order_id=${encodeURIComponent(orderId)}`,
    productDetail: (id: number | string) => `/product/${id}`,
    profile: '/profile',
    inbox: '/inbox',
    demoInbox: '/demo-inbox',
    chaosLab: '/chaos-lab',
    qaGuide: '/for-testers',
    apiDocs: '/api-docs',

    // Admin pages
    admin: {
        dashboard: '/admin/dashboard',
        inventory: '/admin/inventory',
        coupons: '/admin/coupons',
        claims: '/admin/claims'
    },

    // API (JSON/REST)
    api: {

        // Product & search
        products: '/api/products',
        productDetail: (id: number | string) => `/api/products/${id}`,
        resetStockSafe: `/api/products/reset-stock`,
        
        // Cart (legacy + REST)
        cartAdd: '/api/cart/add',
        cartUpdate: '/api/cart/update',
        cartRemove: '/api/cart/remove',
        cart: '/api/cart',
        cartItem: (id: number | string) => `/api/cart/items/${id}`,
        cartCoupons: '/api/cart/coupons',
        cartReset: '/api/cart/reset',

        // Orders
        orderCreateIntent: '/order/api/create-payment-intent',
        orderCreate: '/order/api/create',
        orderMockPay: '/order/api/mock-pay',

        // Test utilities
        testReset: '/api/test/reset',
        testSeed: '/api/test/seed',

        // Chaos + AI
        chaosConfig: '/api/chaos/config',
        chat: '/api/chat',

        // Notifications
        notifications: '/notifications/list',
        adminNotifications: '/admin/notifications/list'
    }
} as const;
