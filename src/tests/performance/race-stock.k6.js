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
    // ยอมให้มี Error ได้บ้าง (เผื่อ Network/Timeout) แต่ถ้า Logic ถูกต้อง 
    // ส่วนใหญ่ควรจะผ่าน check และไม่นับเป็น req_failed
    'http_req_failed': ['rate<0.1'], 
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
  // เลือกสินค้าตัวแรก
  const product = body.products && body.products.length > 0 ? body.products[0] : null;

  if (!product) {
    throw new Error('No products found!'); 
  }

  // --- Display Product Info ---
  console.log(`\n=============================================`);
  console.log(`🎯 Testing with Product Name: "${product.name}"`);
  console.log(`🆔 Product ID: ${product.id}`);
  console.log(`📦 Initial Stock: ${product.stock}`);
  console.log(`=============================================\n`);
  // -----------------------------

  return { productId: product.id };
}

export default function (data) {
  const productId = data.productId;

  // 1. Register Unique User
  const jar = http.cookieJar();
  const username = `k6_${__VU}_${Math.floor(Math.random()*100000)}`;
  const email = `${username}@test.com`;
  const password = 'password123';

  const regRes = http.post(`${BASE_URL}/register`, { username, email, password, confirmPassword: password });
  check(regRes, { 
    'Registered': (r) => {
      // Fail if service unavailable or server error
      if (r.status === 503 || r.status === 500) return false;
      // Fail if body contains timeout/connection error keywords
      if (r.body && (r.body.includes('timeout') || r.body.includes('unavailable') || r.body.includes('connect'))) return false;
      // Success: 200 or 302 redirect
      return r.status === 200 || r.status === 302;
    }
  });

  // 2. Login
  const loginRes = http.post(`${BASE_URL}/login`, { username, password });
  check(loginRes, { 
    'Logged In': (r) => {
      // Fail if service unavailable or server error
      if (r.status === 503 || r.status === 500) return false;
      // Fail if body contains timeout/connection error keywords
      if (r.body && (r.body.includes('timeout') || r.body.includes('unavailable') || r.body.includes('connect'))) return false;
      // Success: 200 or 302 redirect  
      return r.status === 200 || r.status === 302;
    }
  });

  // 3. Add to Cart
  const payload = JSON.stringify({
    productId: productId,
    quantity: 3
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  const addRes = http.post(`${BASE_URL}/api/cart/add`, payload, params);
  check(addRes, { 'Added to Cart': (r) => r.status === 200 });

  // 4. Checkout (Mock Pay)
  const paymentMock = __ENV.PAYMENT_MOCK;
  const payParams = {};
  
  if (paymentMock) {
    payParams.headers = { 'X-Mock-Payment-Override': paymentMock }; 
  }

  const checkoutRes = http.post(`${BASE_URL}/api/orders/mock-pay`, null, payParams);
  
  // --- จุดที่แก้ไข: อัปเดต Logic การตรวจผลลัพธ์ ---
  const isCheckoutSuccess = check(checkoutRes, {
    'Checkout Valid or OOS': (r) => {
      // Case 1: จ่ายเงินสำเร็จ (200 OK) -> ถือว่าผ่าน
      if (r.status === 200) return true;

      // Case 2: ของหมด (400 Bad Request) -> ถือว่าผ่าน (เพราะระบบกันได้ถูกต้อง)
      if (r.status === 400) {
         const body = r.body;
         // เช็ค Keyword ที่ Backend ตอบกลับมาจริงๆ (จาก Log รอบที่แล้ว)
         return body.includes('out of stock') || 
                body.includes('remain') || 
                body.includes('limit');
      }

      // ถ้าบังคับใช้ Mock แล้วเจอ error "disabled" -> ถือว่าไม่ผ่าน
      if (paymentMock === 'mock' && r.status === 400 && r.body.includes('disabled')) {
         return false;
      }
      
      // กรณีอื่นๆ (เช่น 500 Error, Timeout) -> ถือว่าไม่ผ่าน
      return false;
    }
  });

  if (!isCheckoutSuccess) {
      console.error(`❌ Checkout Failed: Status ${checkoutRes.status} Body: ${checkoutRes.body}`);
  }

  sleep(1);
}