export const raceThresholds = {
    http_req_duration: ['p(95)<5000'],  // Allow up to 5s (DB locks may cause delays)
    http_req_failed: ['rate<0.95'],     // Most requests will "fail" (400 out of stock) - that's expected!
};
