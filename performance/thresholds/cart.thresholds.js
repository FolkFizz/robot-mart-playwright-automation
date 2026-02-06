export const cartThresholds = {
    http_req_duration: ['p(95)<800'], // Cart operations might be slightly slower (writes)
    http_req_failed: ['rate<0.01'],
};
