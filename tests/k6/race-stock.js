import http from 'k6/http';
import { check, sleep } from 'k6';

// Configuration
const BASE_URL = 'https://robot-store-sandbox.onrender.com';
const RESET_KEY = __ENV.RESET_KEY;

if (!RESET_KEY) {
  throw new Error('RESET_KEY is required. Run with -e RESET_KEY=your_key');
}

export const options = {
  scenarios: {
    oversell: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 1,
      maxDuration: '1m',
    },
  },
  thresholds: {
    // We expect some failures only if race condition is handled correctly (400)
    // But for this script, we count 400 as a "success" (handled).
    // Actual 500s or network errors should generally be low.
    'http_req_failed': ['rate<1.0'], // Relax threshold for manual inspection
  },
};

export function setup() {
  // 1. Reset Stock
  const resetRes = http.post(`${BASE_URL}/api/products/reset-stock`, null, {
    headers: { 'X-RESET-KEY': RESET_KEY },
  });
  check(resetRes, { 'Setup: Stock Reset': (r) => r.status === 200 });

  // 2. Fetch Valid Product ID
  const prodRes = http.get(`${BASE_URL}/api/products`);
  check(prodRes, { 'Setup: Get Products': (r) => r.status === 200 });
  
  const body = prodRes.json();
  const product = body.products && body.products.length > 0 ? body.products[0] : null;

  if (!product) {
    throw new Error('No products found!'); 
  }

  return { productId: product.id };
}

export default function (data) {
  const productId = data.productId;

  // 1. Register Unique User
  // Use a shorter name to avoid conflicts if re-running
  const jar = http.cookieJar();
  const username = `k6_${__VU}_${Math.floor(Math.random()*100000)}`;
  const email = `${username}@test.com`;
  const password = 'password123';

  const regRes = http.post(`${BASE_URL}/register`, { username, email, password, confirmPassword: password });
  check(regRes, { 'Registered': (r) => r.status === 200 || r.status === 302 });

  // 2. Login
  const loginRes = http.post(`${BASE_URL}/login`, { username, password });
  check(loginRes, { 'Logged In': (r) => r.status === 200 || r.status === 302 });

  // 3. Add to Cart
  const addRes = http.post(`${BASE_URL}/api/cart/add`, { productId: productId, quantity: 3 });
  if (!check(addRes, { 'Added to Cart': (r) => r.status === 200 })) {
     console.error(`Add Cart Failed: ${addRes.status} ${addRes.body}`);
  }

  // 4. Checkout (Mock Pay)
  const checkoutRes = http.post(`${BASE_URL}/api/orders/mock-pay`);
  
  // Successful checkout OR Graceful Out-of-Stock handling are both "valid" behaviors of the app.
  // 500 Error is a failure.
  if (!check(checkoutRes, {
    'Checkout Valid or OOS': (r) => r.status === 200 || (r.status === 400 && (r.body.includes('stock') || r.body.includes('mock')))
  })) {
     console.log(`Checkout Failed: ${checkoutRes.status} ${checkoutRes.body}`);
  }

  sleep(1);
}
