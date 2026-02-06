export const checkoutThresholds = {
    http_req_duration: ['p(95)<1000'], // Checkout involves 3rd party calls (stripe mock)
    http_req_failed: ['rate<0.00'],    // ZERO tolerance for errors in checkout
};
