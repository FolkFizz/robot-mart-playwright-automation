# สรุป Test Case ฝั่ง k6 Performance

<!-- nav-toc:start -->
[English](K6_TEST_CASE_SUMMARY.md) | [ภาษาไทย](K6_TEST_CASE_SUMMARY_TH.md)

## Table of Contents
- [Script Catalog](#k6-th-script-catalog)
- [auth.k6.js](#k6-th-auth)
- [breakpoint.k6.js](#k6-th-breakpoint)
- [browse.k6.js](#k6-th-browse)
- [cart.k6.js](#k6-th-cart)
- [checkout.k6.js](#k6-th-checkout)
- [load.k6.js](#k6-th-load)
- [race-condition.k6.js](#k6-th-race-condition)
- [smoke.k6.js](#k6-th-smoke)
- [soak.k6.js](#k6-th-soak)
- [stress.k6.js](#k6-th-stress)
<!-- nav-toc:end -->

- จำนวนสคริปต์ทั้งหมด: 10
- จำนวน Flow blocks รวม: 25
- จำนวน Validation checks รวม: 71
- ขอบเขต: `performance/scripts/*.k6.js`
- หมายเหตุ: ชื่อ check/group คงภาษาอังกฤษเพื่อให้อ้างอิงกับสคริปต์ k6 ตรงกัน

<a id="k6-th-script-catalog"></a>
## รายละเอียดรายสคริปต์

---

<a id="k6-th-auth"></a>
### performance/scripts/auth.k6.js

- **ภาพรวม:** ตรวจสอบ performance ของ authentication session flow ครอบคลุม login และการเข้าถึง profile หลัง login
- **สรุป:** วัดความเสถียรของ auth gate ภายใต้โหลดที่เพิ่มขึ้น โดยติดตาม login ที่สำเร็จ, auth redirect และ session failure ที่ไม่คาดคิด
- **Test flow:** Login → เข้าถึง `/profile` → จำแนก success vs auth rejection ภายใต้โหลดที่เพิ่มขึ้น
- **Business logic ที่ตรวจสอบ:** ความน่าเชื่อถือของ session gate สำหรับ commerce journey ทั้งหมดที่ต้องต่อยอดจากนี้
- **Flow blocks (2):** Login, Profile Access
- **Validation checks (3):**
  - `login status is 200/302/303`
  - `login not redirected back to /login`
  - `profile is accessible after login`
- **Endpoint สำคัญ:** `/login`, `/profile`

---

<a id="k6-th-breakpoint"></a>
### performance/scripts/breakpoint.k6.js

- **ภาพรวม:** Arrival rate breakpoint test เพื่อหา maximum sustainable throughput ของ catalog endpoint แบบ lightweight
- **สรุป:** Ramp request rate เป็นช่วง ๆ และบันทึก latency/failure inflection point เพื่อประเมิน operational capacity จริง
- **Test flow:** Ramp arrival rate ไปยัง `/api/products` → ติดตาม latency/fail ตามช่วง rate
- **Business logic ที่ตรวจสอบ:** Capacity planning — หา sustainable throughput และ safe operational headroom
- **Flow blocks (0):** ไม่มี (single-path iteration)
- **Validation checks (3):**
  - `status is 200`
  - `response time < 5s`
  - `returns JSON payload`
- **Endpoint สำคัญ:** `/api/products`

---

<a id="k6-th-browse"></a>
### performance/scripts/browse.k6.js

- **ภาพรวม:** Guest browse performance path ครอบคลุม home page, product list API และ product detail API
- **สรุป:** ตรวจสอบ response contract และ latency พฤติกรรมสำหรับ read-heavy catalog interaction ภายใต้ traffic profile ที่เพิ่มขึ้น
- **Test flow:** เยี่ยม home → ดึง product list → ดึง product detail ในแต่ละ iteration
- **Business logic ที่ตรวจสอบ:** Availability และ contract integrity ของ read-heavy catalog ภายใต้โหลด
- **Flow blocks (3):** Visit Home Page, Browse Product Catalog, View Product Details
- **Validation checks (10):**
  - `home status is 200`
  - `home has html content`
  - `catalog status is 200`
  - `catalog returns json`
  - `catalog payload has ok=true`
  - `catalog payload has products array`
  - `detail status is 200`
  - `detail returns json`
  - `detail payload has ok=true`
  - `detail payload contains product.id`
- **Endpoint สำคัญ:** `/api/products`

---

<a id="k6-th-cart"></a>
### performance/scripts/cart.k6.js

- **ภาพรวม:** Cart performance test สำหรับ write ของ add-to-cart และ read consistency ของ cart ภายใต้ concurrent shopper traffic
- **สรุป:** ติดตาม add ที่สำเร็จเทียบกับ controlled stock rejection ขณะรับรองว่า cart API ยัง responsive และปราศจาก server error
- **Test flow:** (Optional) reset stock → เพิ่มสินค้าลงตะกร้า → อ่าน cart payload เพื่อตรวจสอบ consistency
- **Business logic ที่ตรวจสอบ:** Cart write/read resilience พร้อม controlled stock rejection handling
- **Flow blocks (2):** Add Item to Cart, View Cart
- **Validation checks (4):**
  - `cart add handled`
  - `cart add no 5xx`
  - `view cart status is 200`
  - `view cart returns json`
- **Endpoint สำคัญ:** `/api/cart/add`

---

<a id="k6-th-checkout"></a>
### performance/scripts/checkout.k6.js

- **ภาพรวม:** Stress-focused checkout performance test สำหรับ critical buyer path ตั้งแต่ authentication จนถึง mock payment สำเร็จ
- **สรุป:** ประเมิน checkout resilience ภายใต้ flash-sale load รวมถึง cart setup, auth recovery และ stock-based rejection ที่คาดไว้
- **Test flow:** Authenticate (หรือ auto-register) → เพิ่มสินค้าลงตะกร้า → รัน mock checkout ภายใต้ stress
- **Business logic ที่ตรวจสอบ:** Checkout path resilience พร้อม valid business 400 response จาก stock check
- **Flow blocks (3):** Authenticate, Setup: Add to Cart, Checkout Action
- **Validation checks (11):**
  - `login status is allowed (200/302/303)`
  - `login does not redirect back to /login`
  - `profile is accessible after login`
  - `register status is allowed (200/302/303)`
  - `register does not loop back to /register`
  - `cart add handled`
  - `cart add no 5xx`
  - `checkout status is 200 or 400`
  - `checkout has no server error`
  - `successful checkout has orderId`
  - `successful checkout has status=success`
- **Endpoint สำคัญ:** `/api/products`, `/api/cart/add`, `/order/api/mock-pay`, `/login`, `/profile`, `/register`

---

<a id="k6-th-load"></a>
### performance/scripts/load.k6.js

- **ภาพรวม:** Configurable E2E load journey รวม login, browse, add-to-cart และ mock checkout
- **สรุป:** เปรียบเทียบโหมด balanced กับ acceptance run ขณะติดตาม journey completion trend และ step-level latency trend
- **Test flow:** Login → Browse → Add to Cart → Checkout เป็น full customer journey loop
- **Business logic ที่ตรวจสอบ:** E2E journey quality ในโหมด balanced และ acceptance threshold
- **Flow blocks (4):** Login, Browse, Cart, Checkout
- **Validation checks (7):**
  - `login status is 200/302/303`
  - `login not redirected back to /login`
  - `cart handled`
  - `cart no 5xx`
  - `checkout status is 200/400`
  - `checkout has no 5xx`
  - `checkout success has orderId`
- **Endpoint สำคัญ:** `/api/cart/add`, `/order/api/mock-pay`, `/login`

---

<a id="k6-th-race-condition"></a>
### performance/scripts/race-condition.k6.js

- **ภาพรวม:** Concurrent stress test มุ่งเน้นการป้องกัน oversell เมื่อ user จำนวนมาก checkout สินค้าเดิมพร้อมกัน
- **สรุป:** ตรวจสอบ contention handling โดยคาดผลลัพธ์แบบ mixed success/rejection โดยไม่มี 5xx error หรือ inconsistent checkout behavior
- **Test flow:** เล็งสินค้าชิ้นเดียวกัน → concurrent add-to-cart + near-simultaneous checkout attempt
- **Business logic ที่ตรวจสอบ:** Oversell protection และ controlled contention behavior เมื่อ checkout พร้อมกัน
- **Flow blocks (3):** Authenticate, Add to Cart, Concurrent Checkout
- **Validation checks (7):**
  - `race login status is 200/302/303`
  - `race login not redirected back to /login`
  - `race profile is accessible`
  - `race cart add handled`
  - `race cart add no 5xx`
  - `race checkout handled`
  - `race checkout no 5xx`
- **Endpoint สำคัญ:** `/api/products`, `/api/cart/add`, `/order/api/mock-pay`, `/login`, `/profile`

---

<a id="k6-th-smoke"></a>
### performance/scripts/smoke.k6.js

- **ภาพรวม:** Quick smoke performance check สำหรับ core availability ของ home และ product API endpoint
- **สรุป:** ทำหน้าที่เป็น pre-validation ก่อน workload หนัก โดยตรวจสอบ status, payload shape และ basic latency threshold
- **Test flow:** Quick health pass ไปยัง home และ `/api/products` ก่อนรัน test หนัก
- **Business logic ที่ตรวจสอบ:** Go/no-go signal ที่รวดเร็วสำหรับ platform availability และ baseline latency
- **Flow blocks (2):** Home Page, Product API
- **Validation checks (6):**
  - `home status is 200`
  - `home content type is html`
  - `products status is 200`
  - `products content type is json`
  - `products payload has ok=true`
  - `products payload has array`
- **Endpoint สำคัญ:** `/api/products`

---

<a id="k6-th-soak"></a>
### performance/scripts/soak.k6.js

- **ภาพรวม:** Long-duration soak test เพื่อตรวจสอบ endurance stability ของ browse, cart และ checkout operation
- **สรุป:** ติดตามการเปลี่ยนแปลงตามเวลา รวมถึง early-to-late response trend, authentication durability และการสะสม unexpected failure
- **Test flow:** Authenticated browse/cart/checkout loop ระยะยาว พร้อมติดตาม degradation drift ตามเวลา
- **Business logic ที่ตรวจสอบ:** Endurance stability และการตรวจจับ long-run degradation
- **Flow blocks (3):** Browse, Cart, Checkout
- **Validation checks (10):**
  - `soak login status is 200/302/303`
  - `soak login not redirected back to /login`
  - `soak profile is accessible`
  - `soak browse status is 200`
  - `soak browse returns json`
  - `soak cart add handled`
  - `soak cart add no 5xx`
  - `soak checkout handled`
  - `soak checkout no 5xx`
  - `soak checkout success has orderId`
- **Endpoint สำคัญ:** `/api/products`, `/api/cart/add`, `/order/api/mock-pay`, `/login`, `/profile`

---

<a id="k6-th-stress"></a>
### performance/scripts/stress.k6.js

- **ภาพรวม:** Stress workload ด้วย weighted browse/cart/checkout mix เพื่อหา degradation ภายใต้แรงกดดันที่เพิ่มขึ้น
- **สรุป:** ติดตาม performance degradation และ error rate ขณะแยกแยะ expected business rejection จาก actual failure
- **Test flow:** Weighted operation mix (browse/cart/checkout) ขณะ VU ramp ขึ้นเพื่อหา degradation point
- **Business logic ที่ตรวจสอบ:** Breakpoint discovery พร้อม expected business rejection ที่แยกออกจาก true failure
- **Flow blocks (3):** Browse, Cart, Checkout
- **Validation checks (10):**
  - `stress login status is 200/302/303`
  - `stress login not redirected to /login`
  - `stress profile is accessible`
  - `browse successful`
  - `browse returns json`
  - `cart add handled`
  - `cart add no 5xx`
  - `checkout status is handled`
  - `checkout no 5xx`
  - `checkout success has orderId`
- **Endpoint สำคัญ:** `/api/products`, `/api/cart/add`, `/order/api/mock-pay`, `/login`, `/profile`