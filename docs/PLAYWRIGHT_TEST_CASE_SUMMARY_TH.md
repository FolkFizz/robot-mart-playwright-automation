# สรุป Test Case ฝั่ง Playwright

- จำนวน Test Suite ทั้งหมด: 29
- จำนวน Test Case ทั้งหมด: 303
- จำนวน Positive cases: 114
- จำนวน Negative cases: 100
- จำนวน Edge cases: 89
- ขอบเขต: `tests/**/*.spec.ts`
- หมายเหตุ: ชื่อ Test ID/Case คงภาษาอังกฤษเพื่อให้อ้างอิงกับไฟล์เทสได้ตรงกัน

## คำอธิบาย P/N/E

- `P` = Positive case: เส้นทางปกติ (happy path) หรือพฤติกรรมที่คาดว่าจะสำเร็จ
- `N` = Negative case: input ไม่ถูกต้อง เส้นทางที่ไม่อนุญาต หรือผลลัพธ์ที่ควรถูกปฏิเสธ
- `E` = Edge case: เคสขอบเขต การทำงานพร้อมกัน (concurrency) ความทนทาน หรือสถานการณ์ที่พบไม่บ่อย

## สรุปตามหมวด

| หมวด | จำนวนไฟล์ | จำนวนเคส | Positive | Negative | Edge |
| --- | ---: | ---: | ---: | ---: | ---: |
| a11y | 3 | 29 | 13 | 7 | 9 |
| api | 6 | 44 | 17 | 16 | 11 |
| e2e | 11 | 146 | 59 | 48 | 39 |
| integration | 5 | 47 | 14 | 13 | 20 |
| security | 4 | 37 | 11 | 16 | 10 |

## รายละเอียดรายไฟล์เทส

### tests/a11y/cart.a11y.spec.ts (12 เคส)

- **ภาพรวม:** ตรวจสอบ accessibility ของหน้าตะกร้าสินค้า ครอบคลุม semantics, keyboard navigation และการควบคุมต่าง ๆ ในตะกร้า
- **สรุป:** ตรวจสอบการทำงานที่สำคัญตามมาตรฐาน WCAG สำหรับแถวสินค้า, ตัวควบคุมจำนวน/ปุ่ม remove, ช่อง coupon และข้อความสำหรับตะกร้าว่าง
- **Test flow:** Seed state ตะกร้า → เปิดหน้าตะกร้า → รัน a11y scan + ตรวจสอบ keyboard navigation บนตัวควบคุม quantity/remove/coupon
- **Business logic ที่ตรวจสอบ:** WCAG 2.1 AA สำหรับการโต้ตอบกับตะกร้า, label ที่อ่านออกได้ และ state ว่าง/error ที่ปลอดภัย

**Positive — 6 เคส:**
- A11Y-CART-P01: หน้าตะกร้าต้องไม่มี critical violation
- A11Y-CART-P02: ตัวควบคุมจำนวนสินค้าในตะกร้าสามารถใช้งานผ่าน keyboard ได้
- A11Y-CART-P03: ปุ่มลบสินค้ามี ARIA label ที่เหมาะสม
- A11Y-CART-P04: ยอดรวมตะกร้าถูก announce ไปยัง screen reader
- A11Y-CART-P05: ช่อง input coupon เข้าถึงได้และมี label ที่ถูกต้อง
- A11Y-CART-P06: ปุ่ม checkout สามารถใช้งานผ่าน keyboard ได้

**Negative — 3 เคส:**
- A11Y-CART-N01: state ตะกร้าว่างยังคง accessible อยู่
- A11Y-CART-N02: คำเตือนเรื่องจำนวนสต็อก ถูก announce ไปยัง screen reader
- A11Y-CART-N03: ข้อความ error จาก coupon ไม่ถูกต้องสามารถเข้าถึงได้

**Edge — 3 เคส:**
- A11Y-CART-E01: ตะกร้าที่มีสินค้ามากกว่า 10 รายการยังคง accessible อยู่
- A11Y-CART-E02: ชื่อสินค้าที่ยาวไม่ทำให้การ announce ของ screen reader พัง
- A11Y-CART-E03: state loading ของตะกร้ายังคง accessible อยู่

---

### tests/a11y/checkout.a11y.spec.ts (10 เคส)

- **ภาพรวม:** ตรวจสอบ accessibility ของหน้า checkout และ form การชำระเงิน
- **สรุป:** ตรวจสอบ label, ลำดับ focus, ข้อความ validation และพฤติกรรมของส่วน payment ทั้งในโหมด mock และ Stripe
- **Test flow:** เปิด checkout โดยมีสินค้าในตะกร้า → ตรวจสอบ semantics/focus order ของ form → ตรวจสอบ accessibility state ของส่วน payment
- **Business logic ที่ตรวจสอบ:** ตัวควบคุม form ใน checkout ต้องยัง accessible ได้ทั้งในโหมด validation และ payment rendering

**Positive — 6 เคส:**
- A11Y-CHK-P01: หน้า checkout ต้องไม่มี critical violation
- A11Y-CHK-P02: ช่องที่อยู่มี `autocomplete` attribute ที่เหมาะสม
- A11Y-CHK-P03: สามารถเลือกวิธีการชำระเงินได้
- A11Y-CHK-P04: ส่วนสรุปคำสั่งซื้อ screen reader-friendly
- A11Y-CHK-P05: การกด Tab บน keyboard สามารถไปถึงตัวควบคุมต่าง ๆ ใน form ได้
- A11Y-CHK-P06: Skip link ทำงานได้ถูกต้อง

**Negative — 2 เคส:**
- A11Y-CHK-N01: ข้อความ error จาก form validation ถูก announce ไปยัง screen reader
- A11Y-CHK-N02: ช่อง payment ที่ว่างจะ block การ submit พร้อม browser validation

**Edge — 2 เคส:**
- A11Y-CHK-E01: state loading ของ checkout ยังคง accessible อยู่
- A11Y-CHK-E02: Stripe payment element ใน iframe สามารถเข้าถึงได้

---

### tests/a11y/home.a11y.spec.ts (7 เคส)

- **ภาพรวม:** ตรวจสอบ accessibility ของหน้าแรก (catalog) และ landmark navigation ระดับ global
- **สรุป:** ครอบคลุม semantics ของตาราง product, keyboard navigation, ตัวควบคุม filter/search และ known legacy exception ที่ไม่ block การทำงาน
- **Test flow:** เปิด catalog หน้าแรก → ตรวจสอบ landmark/controls → ตรวจสอบ keyboard navigation และพฤติกรรม accessibility ของ filter/search
- **Business logic ที่ตรวจสอบ:** ตัวควบคุม search ใน catalog ต้อง keyboard/screen-reader friendly และมี landmark ที่เสถียร

**Positive — 1 เคส:**
- A11Y-HOME-P01: หน้าแรกต้องไม่มี critical violation

**Negative — 2 เคส:**
- A11Y-HOME-N01: การกด Tab ต้อง focus ไปที่ interactive element ที่มองเห็นได้
- A11Y-HOME-N02: state loading ยังคง accessible อยู่

**Edge — 4 เคส:**
- A11Y-HOME-E01: ตาราง product ที่มีรายการจำนวนมากยังคง accessible อยู่
- A11Y-HOME-E02: ตัวควบคุม search และ price filter ผ่านเกณฑ์ color contrast
- A11Y-HOME-E03: ช่อง search รองรับการ submit ผ่าน keyboard โดยไม่มี focus trap
- A11Y-HOME-E04: หมวดหมู่และตัว sort สามารถใช้งานผ่าน keyboard ได้

---

### tests/api/admin.api.spec.ts (9 เคส)

- **ภาพรวม:** ตรวจสอบ Admin API สำหรับการดำเนินการ stock ที่ต้องมีสิทธิ์, notification และ endpoint ที่ป้องกันไว้
- **สรุป:** ตรวจสอบว่า route ที่เป็น admin-only บังคับใช้ role check ขณะที่ stock reset และ notification/product/admin contract ยังคงเสถียร
- **Test flow:** Login context (admin/user/anon) → เรียก admin/reset endpoint → ยืนยัน status code และ response contract
- **Business logic ที่ตรวจสอบ:** Endpoint ที่เป็น admin-only ต้องการ role ที่เหมาะสมและ reset key ที่ถูกต้อง ขณะที่ต้อง expose contract ที่เสถียร

**Positive — 4 เคส:**
- ADMIN-API-P01: รีเซ็ต stock ผ่าน API ได้อย่างปลอดภัย
- ADMIN-API-P02: รายการ notification ของ admin คืนข้อมูลกลับมา
- ADMIN-API-P03: Product API คืนระดับ stock ปัจจุบัน
- ADMIN-API-P04: การยืนยัน stock reset คืนสินค้ากลับมา

**Negative — 3 เคส:**
- ADMIN-API-N01: User ทั่วไปไม่สามารถเข้าถึง admin endpoint ได้
- ADMIN-API-N02: การเข้าถึง Admin API โดยไม่ได้ authenticate ถูกปฏิเสธ
- ADMIN-API-N03: reset key ไม่ถูกต้องถูกปฏิเสธโดย reset API

**Edge — 2 เคส:**
- ADMIN-API-E01: Pagination ของ admin notification จัดการ dataset ขนาดใหญ่ได้
- ADMIN-API-E02: การรีเซ็ต stock พร้อมกันถูกจัดการอย่างถูกต้อง (graceful)

---

### tests/api/auth.api.spec.ts (9 เคส)

- **ภาพรวม:** Auth API ตรวจสอบผลลัพธ์การ login และพฤติกรรม session cookie
- **สรุป:** ยืนยันการ authenticate ของ user/admin, การจัดการ credential ที่ผิดพลาด, ความคงอยู่ของ session และขอบเขตการเข้าถึงตาม role
- **Test flow:** ส่ง login form → ตรวจสอบ session/cookie state → ตรวจสอบ access control ปลายทางตาม role
- **Business logic ที่ตรวจสอบ:** Session authentication ควบคุม downstream authorization และ security attribute ของ cookie

**Positive — 4 เคส:**
- AUTH-API-P01: การ login ของ user สร้าง session ที่ authenticated แล้ว
- AUTH-API-P02: การ login ของ admin สร้าง session ที่ authenticated แล้ว
- AUTH-API-P03: Session ของ user ที่ authenticated คงอยู่ข้ามหลาย request
- AUTH-API-P04: Session cookie มี security attribute ตามที่คาดไว้

**Negative — 3 เคส:**
- AUTH-API-N01: Credential ไม่ถูกต้องคืน error กลับมา
- AUTH-API-N02: Credential ว่างถูกปฏิเสธและยังคงไม่ผ่าน authentication
- AUTH-API-N03: Session ของ user ทั่วไปไม่สามารถเข้าถึง admin endpoint ได้

**Edge — 2 เคส:**
- AUTH-API-E01: การ re-authenticate ด้วย role อื่นใน session เดียวกัน
- AUTH-API-E02: การ login ที่ล้มเหลวซ้ำ ๆ สามารถกู้คืนได้ด้วยการ login ที่ถูกต้องในภายหลัง

---

### tests/api/cart.api.spec.ts (7 เคส)

- **ภาพรวม:** Cart API ครอบคลุมการเปลี่ยนแปลงรายการสินค้า, การจัดการ coupon และการดึง cart state
- **สรุป:** ตรวจสอบ flow ของ add/update/remove, stock/quantity validation และพฤติกรรมข้อจำกัดการซื้อสำหรับ admin session
- **Test flow:** เปลี่ยนแปลงตะกร้าผ่าน API (add/update/remove/coupon) → ดึง cart state → ตรวจสอบ stock constraint และ privilege
- **Business logic ที่ตรวจสอบ:** การเปลี่ยนแปลงตะกร้าต้องบังคับใช้ stock และปฏิเสธ pattern การซื้อที่ไม่ได้รับอนุญาต

**Positive — 2 เคส:**
- CART-API-P01: เพิ่ม, อัปเดต, ลบสินค้าในตะกร้า
- CART-API-P02: ใช้งานและลบ coupon

**Negative — 3 เคส:**
- CART-API-N01: การเพิ่มสินค้าด้วย product ID ไม่ถูกต้องคืน error
- CART-API-N02: จำนวนที่เกินขีดจำกัด stock ล้มเหลวอย่างถูกต้อง
- CART-API-N03: จำนวนติดลบถูกปฏิเสธ

**Edge — 2 เคส:**
- CART-API-E01: User ที่เป็น admin ไม่สามารถเพิ่มสินค้าลงตะกร้าได้
- CART-API-E02: การเพิ่มสินค้าเดิมซ้ำหลายครั้งจะรวมจำนวนเข้าด้วยกัน

---

### tests/api/chat.ai-live.spec.ts (4 เคส)

- **ภาพรวม:** Canary test สำหรับ AI chat แบบ live กับ model จริง ภายใต้ quota ที่กำหนด
- **สรุป:** ตรวจสอบคุณภาพ response ทันที, พฤติกรรม safety refusal และ latency guard เมื่อเปิดใช้งาน `RUN_AI_LIVE`
- **Test flow:** ส่ง live prompt ไปยัง chat endpoint → ยืนยันคุณภาพ/safety พฤติกรรม → ตรวจสอบ latency เทียบกับ live budget
- **Business logic ที่ตรวจสอบ:** เส้นทาง AI แบบ live ต้องรักษา response ที่มีประโยชน์, safety refusal และ latency ที่ยอมรับได้

**Positive — 2 เคส:**
- CHAT-AI-LIVE-P01: คำถามเรื่องราคาและ stock คืนคำตอบกลับมา
- CHAT-AI-LIVE-P02: Prompt คำแนะนำคืน response ที่ไม่ว่างเปล่า

**Negative — 1 เคส:**
- CHAT-AI-LIVE-N01: Prompt ที่เป็นอันตรายยังคงถูก block

**Edge — 1 เคส:**
- CHAT-AI-LIVE-E01: Latency แบบ live อยู่ภายใต้ budget ที่กำหนด

---

### tests/api/chat.api.spec.ts (9 เคส)

- **ภาพรวม:** Contract test ของ Chat API สำหรับ prompt ปกติ, safety block และความทนทานของ endpoint
- **สรุป:** ตรวจสอบความเสถียรของ response schema, พฤติกรรม refusal สำหรับ prompt ที่มีความเสี่ยง และความน่าเชื่อถือในสถานการณ์ว่าง, concurrent และ high-latency
- **Test flow:** ส่ง payload ปกติ + เสี่ยง + edge → ตรวจสอบ response contract และพฤติกรรม block → ตรวจสอบ concurrent/latency stability
- **Business logic ที่ตรวจสอบ:** Chat API ต้องรักษา response schema และปฏิเสธ prompt ที่ไม่ปลอดภัยโดยไม่เกิด instability

**Positive — 3 เคส:**
- CHAT-API-P01: Prompt ปกติคืน response ที่ไม่ว่างเปล่า
- CHAT-API-P02: Prompt หลายภาษาคืน response ที่ไม่ว่างเปล่า
- CHAT-API-P03: `urlencoded` form payload (widget style) ใช้งานได้

**Negative — 3 เคส:**
- CHAT-API-N01: Prompt ที่พยายาม extract credential ถูก block
- CHAT-API-N02: วลีที่เป็น prompt injection ถูก block
- CHAT-API-N03: GET endpoint ที่ไม่รองรับไม่ถูก expose

**Edge — 3 เคส:**
- CHAT-API-E01: ข้อความว่างหรือไม่มีข้อความยังคงได้รับ response แบบ controlled
- CHAT-API-E02: Request พร้อมกันมีความเสถียรและ response ถูกต้อง
- CHAT-API-E03: Response latency อยู่ภายใต้ operational budget

---

### tests/api/orders.api.spec.ts (6 เคส)

- **ภาพรวม:** Orders API ตรวจสอบการสร้าง payment intent และ precondition ก่อนการชำระเงิน
- **สรุป:** ครอบคลุมพฤติกรรม mock vs Stripe intent, การป้องกันตะกร้าว่าง, การ redirect ไปยัง login และความเสถียรของ concurrent intent request
- **Test flow:** เตรียม cart/auth context → เรียก payment-intent/mock-pay API → ตรวจสอบพฤติกรรมตะกร้าว่าง/auth/concurrency
- **Business logic ที่ตรวจสอบ:** Payment intent ต้องการ authenticated cart state และต้องทนต่อ concurrent request

**Positive — 2 เคส:**
- ORD-API-P01: สร้าง payment intent response ได้สำเร็จ
- ORD-API-P02: Order ID คืน mock payment เมื่อเปิดใช้งาน

**Negative — 3 เคส:**
- ORD-API-N01: การชำระเงินด้วยตะกร้าว่างล้มเหลว
- ORD-API-N02: Payload สินค้าที่ไม่ถูกต้องไม่สามารถข้ามการตรวจสอบตะกร้าว่างได้
- ORD-API-N03: การชำระเงินโดยไม่ผ่าน authentication ถูก redirect ไปยัง login

**Edge — 1 เคส:**
- ORD-API-E01: Concurrent payment intent request มีความเสถียรและไม่ทำให้ตะกร้าเสียหาย

---

### tests/e2e/auth.e2e.spec.ts (15 เคส)

- **ภาพรวม:** E2E test สำหรับ authentication journey ครอบคลุม login, register, password reset และการเปลี่ยน session
- **สรุป:** ตรวจสอบ user flow ทั้งหมด รวมถึงการจัดการ reset token, การกู้คืนผ่าน inbox และ cart continuity ระหว่าง guest/user
- **Test flow:** รัน authentication journey แบบเต็ม (login/register/reset) ผ่าน UI + API state ที่รองรับ → ตรวจสอบ redirect, token/inbox/reset พฤติกรรม และการ merge ตะกร้า
- **Business logic ที่ตรวจสอบ:** Identity lifecycle (register/login/reset/logout) ต้องรักษาความปลอดภัยและ user state ต้องสอดคล้องกัน

**Positive — 5 เคส:**
- AUTH-P01: Login ด้วย credential ที่ถูกต้องสำเร็จ
- AUTH-P02: Logout ล้าง session ได้สำเร็จ
- AUTH-P03: Register ผู้ใช้ใหม่ด้วย credential ที่ unique
- AUTH-P05: ขอ reset ส่งลิงก์ไปยัง email ที่ถูกต้อง
- AUTH-P06: Reset password ด้วย token ที่ถูกต้องสำเร็จ

**Negative — 8 เคส:**
- AUTH-N01: Login ด้วย username ไม่ถูกต้องล้มเหลว
- AUTH-N02: Login ด้วย password ผิดล้มเหลว
- AUTH-N03: Register ด้วย username หรือ email ซ้ำล้มเหลว
- AUTH-N04: Register ด้วย password ที่ไม่ตรงกันล้มเหลว
- AUTH-N06: ขอ reset ด้วย email ที่ไม่มีอยู่แสดงข้อความ generic
- AUTH-N07: Reset ด้วย token ที่หมดอายุล้มเหลว
- AUTH-N08: Reset ด้วย token ไม่ถูกต้อง redirect ไปยัง login
- AUTH-N09: Password ไม่ตรงกันระหว่าง reset แสดง error

**Edge — 2 เคส:**
- AUTH-E04: ตะกร้า guest ถูก merge กับตะกร้าใน DB เมื่อ login
- AUTH-E05: Token ไม่สามารถนำกลับมาใช้ซ้ำได้หลังจาก reset สำเร็จ (security)

---

### tests/e2e/cart.e2e.spec.ts (22 เคส)

- **ภาพรวม:** E2E test พฤติกรรมตะกร้าสินค้าครอบคลุมการเลือกสินค้า, การเปลี่ยนจำนวน, การใช้ coupon และการไปหน้า checkout
- **สรุป:** ยืนยันการคำนวณ math ของตะกร้าใน UI, ผลกระทบจากเกณฑ์ค่าส่ง, feedback เรื่อง stock และ access rule ใน real customer flow
- **Test flow:** Browse/add/update/remove สินค้าใน UI → ใช้ coupon/shipping → ตรวจสอบยอดรวมและ constraint
- **Business logic ที่ตรวจสอบ:** ยอดรวมตะกร้า, coupon และกฎการจัดส่งต้องคงถูกต้องตามที่กำหนดทั้งในเส้นทางปกติและเมื่อเกิด error

**Positive — 9 เคส:**
- CART-P01: เพิ่มสินค้าแรกลงในตะกร้าว่าง
- CART-P02: เพิ่มสินค้าชิ้นที่สองและตรวจสอบการคำนวณ subtotal
- CART-P03: เพิ่มจำนวนอัปเดตยอดรวมและเปิดใช้งานการจัดส่งฟรี
- CART-P04: ใช้ coupon ที่ถูกต้องลดยอดรวม
- CART-P05: ลบ coupon คืนยอดรวมเดิม
- CART-P06: ลบสินค้าออกจากตะกร้าอัปเดตยอดรวม
- CART-P07: Clear ตะกร้าล้างสินค้าทั้งหมด
- CART-P08: ไม่สามารถลดจำนวนต่ำกว่า 1 ได้
- COUP-P02: Coupon code ไม่ case-sensitive

**Negative — 10 เคส:**
- CART-N01: ไม่สามารถเพิ่มจำนวนเกินขีดจำกัด stock ได้
- CART-N02: Admin ไม่สามารถเพิ่มสินค้าลงตะกร้าผ่าน API ได้ (security)
- CART-N02-UI: Admin ไม่สามารถเพิ่มสินค้าลงตะกร้าผ่าน UI ได้
- CART-N03: การเพิ่มสินค้าที่ไม่มีอยู่คืน 404
- CART-N04: ไม่สามารถอัปเดตจำนวนเป็น 0 ได้ (ขั้นต่ำคือ 1)
- CART-N05: ไม่สามารถอัปเดตสินค้าในตะกร้าเกิน stock ที่มีได้
- CART-N07: การอัปเดตตะกร้าเมื่อมี error คืนค่าว่าง
- COUP-N01: Coupon code ไม่ถูกต้องแสดง error
- COUP-N02: Coupon หมดอายุถูกปฏิเสธพร้อม error
- COUP-N04: Coupon code ว่างเปล่าถูกปฏิเสธ

**Edge — 3 เคส:**
- CART-E01: เพิ่มสินค้าจนถึงขีดจำกัด stock พอดีสำเร็จ การเพิ่มอีกหนึ่งชิ้นล้มเหลว
- COUP-E01: Coupon code ที่มี whitespace ถูก trim ออก
- COUP-E05: Coupon ถูกล้างเมื่อ clear ตะกร้า

---

### tests/e2e/catalog.e2e.spec.ts (27 เคส)

- **ภาพรวม:** E2E test การเรียกดู catalog ครอบคลุมรายการสินค้า, filter, sort และการ navigate ไปยังหน้ารายละเอียดสินค้า
- **สรุป:** ตรวจสอบ discoverability และความสอดคล้องของ product card, การโต้ตอบกับ category/search และ transition ไปยังหน้ารายละเอียด
- **Test flow:** โต้ตอบกับ search/filter/sort/deep link → เปิดหน้ารายละเอียด → ตรวจสอบความสอดคล้องของผลลัพธ์และ empty state
- **Business logic ที่ตรวจสอบ:** Logic ของ search/filter/sort ต้องสร้าง product visibility และ routing ที่คาดการณ์ได้

**Positive — 15 เคส:**
- CAT-P01: หน้าแรกแสดงตัวควบคุมหลักครบถ้วน
- CAT-P02: Search อัปเดต URL query
- CAT-P03: Sort อัปเดต URL query
- CAT-P04: การเลือก category อัปเดต URL
- CAT-P05: Price filter อัปเดต URL
- CAT-P06: สินค้า seed มองเห็นได้
- CAT-P07: Search ไม่ case-sensitive
- CAT-P08: Search ด้วยคำบางส่วน
- CAT-P09: Filter ตาม category โดยอัตโนมัติ
- CAT-P10: Filter ตามราคาสูงสุด 500
- CAT-P11: Sort ตามราคาจากน้อยไปมาก
- CAT-P12: Sort ตามราคาจากมากไปน้อย
- CAT-P13: Sort ตามชื่อจาก A-Z
- CAT-P14: เปิดหน้ารายละเอียดสินค้าโดยคลิก card
- CAT-P15: Product card แสดงราคาที่ถูกต้อง

**Negative — 8 เคส:**
- CAT-N01: Search ที่ไม่มีผลลัพธ์แสดง empty state
- CAT-N02: Category ไม่ถูกต้องแสดง empty state
- CAT-N03: ช่วงราคาที่ min > max แสดง empty state
- CAT-N04: Search + category ที่ไม่ตรงกันแสดง empty state
- CAT-N05: Search ด้วยอักขระพิเศษแสดง empty state
- CAT-N06: Sort query ไม่ถูกต้องไม่ทำให้ catalog พัง
- CAT-N07: Price query ที่ไม่ใช่ตัวเลข fallback ได้อย่างถูกต้อง
- CAT-N08: Search ด้วยช่องว่างล้วนไม่แสดงผลลัพธ์

**Edge — 4 เคส:**
- CAT-E01: ช่วงราคาที่ min = max (ขอบเขตพอดี) แสดงผลถูกต้อง
- CAT-E02: Deep link ที่มี filter รวมกัน resolve ได้ตามที่กำหนด
- CAT-E03: Search เดิมซ้ำ ๆ ยังคงให้ผลลัพธ์เดิม
- CAT-E04: Filter + sort รักษา constraint ทั้งสองไว้

---

### tests/e2e/chaos.e2e.spec.ts (10 เคส)

- **ภาพรวม:** Chaos Lab E2E แบบ deterministic ตรวจสอบการควบคุม toggle, graceful degradation และพฤติกรรม reset
- **สรุป:** มุ่งเน้นที่ผลกระทบของ chaos config ที่คาดการณ์ได้, API delay/error พฤติกรรม และการ cleanup กลับสู่สถานะปกติอย่างน่าเชื่อถือ
- **Test flow:** Toggle chaos mode → วัด degradation และ bounded recovery → ตรวจสอบความคงอยู่ของ config และความถูกต้องของ reset
- **Business logic ที่ตรวจสอบ:** Chaos control อาจทำให้ UX ลดลง แต่ต้องรักษา recoverability และ reset guarantee

**Positive — 4 เคส:**
- CHAOS-P01: Chaos Lab แสดงตัวควบคุม toggle ทั้งหมด
- CHAOS-P02: การเปิดใช้งาน layout shift ผ่าน UI คงอยู่หลัง reload
- CHAOS-P03: Delay chaos ทำให้ product API ช้าลงแต่ยังใช้งานได้
- CHAOS-P04: ลูกค้ายังสามารถเรียกดูสินค้าได้ภายใต้ latency + layout shift

**Negative — 3 เคส:**
- CHAOS-N01: Random 500 chaos ทำให้เกิด failure เป็นบางครั้ง ไม่ใช่ downtime ทั้งหมด
- CHAOS-N02: Chaos payload ไม่ถูกต้องถูกละเว้นอย่างปลอดภัย
- CHAOS-N03: Reset ล้าง chaos toggle ที่ active ทั้งหมด

**Edge — 3 เคส:**
- CHAOS-E01: การเปิด chaos ทุกตัวพร้อมกันยังคงเปิดเส้นทาง recovery ไว้
- CHAOS-E02: การอัปเดต config อย่างรวดเร็วเป็นไปตาม last-write-wins
- CHAOS-E03: Control endpoint ยังคงเร็วขณะที่ app endpoint มี delay

---

### tests/e2e/chaos-resilience.e2e.spec.ts (9 เคส)

- **ภาพรวม:** Resilience chaos E2E ตรวจสอบ checkout capability ภายใต้ runtime toggle ที่ก่อกวน
- **สรุป:** ทดสอบ purchase flow แบบ per-toggle และ full chaos พร้อม recovery alternative guarantee และ long-run stability expectation
- **Test flow:** เปิดใช้งาน per-mode/full chaos ระหว่าง purchase flow → พยายาม checkout ซ้ำ ๆ → บังคับใช้ recovery expectation แบบ alternative
- **Business logic ที่ตรวจสอบ:** Critical purchase flow ควรยังคง recoverable แม้จะมีการเปิด disruption toggle

**Edge — 9 เคส:**
- CHAOS-E04: Purchase flow ถึง checkout ภายใต้ dynamicIds chaos
- CHAOS-E05: Purchase flow ถึง checkout ภายใต้ unstable elements chaos
- CHAOS-E06: Purchase flow ยัง recoverable ภายใต้ layoutShift chaos
- CHAOS-E07: Purchase flow ถึง checkout ภายใต้ zombieClicks chaos
- CHAOS-E08: Purchase flow ถึง checkout ภายใต้ textScramble chaos
- CHAOS-E09: Purchase flow ถึง checkout ภายใต้ slow response chaos
- CHAOS-E10: Purchase flow ถึง checkout ภายใต้ random chaos
- CHAOS-E11: Purchase flow ถึง checkout ภายใต้ brokenAssets chaos
- CHAOS-E12: Purchase flow ยัง recoverable เมื่อเปิด chaos toggle ทั้งหมด

---

### tests/e2e/chatbot.e2e.spec.ts (9 เคส)

- **ภาพรวม:** E2E test สำหรับ chatbot widget ครอบคลุมการโต้ตอบของผู้ใช้และการแสดง response
- **สรุป:** ครอบคลุม open/close UX, การ submit, multi-turn history และ fallback behavior ที่มีประสิทธิภาพเมื่อ route ล้มเหลว
- **Test flow:** ขับเคลื่อนการโต้ตอบใน chat widget → ยืนยันการแสดงข้อความ user/bot → ตรวจสอบ failure fallback และ multi-turn continuity
- **Business logic ที่ตรวจสอบ:** Chat widget ต้องใช้งานได้, ทนต่อ failure และปลอดภัยในการจัดการข้อความ

**Positive — 3 เคส:**
- CHAT-E2E-P01: Chat widget เปิดและปิดจากหน้าแรกได้
- CHAT-E2E-P02: การส่งข้อความแสดงข้อความ user และ bot
- CHAT-E2E-P03: กด Enter เพื่อส่งข้อความได้

**Negative — 3 เคส:**
- CHAT-E2E-N01: Input ที่เป็น whitespace ล้วนถูกละเว้น
- CHAT-E2E-N02: Network cancel แสดงข้อความ error fallback
- CHAT-E2E-N03: Response ที่มี format ไม่ถูกต้องแสดงข้อความ error fallback

**Edge — 3 เคส:**
- CHAT-E2E-E01: ข้อความ user ที่ยาวถูก render ได้และ input ถูกล้าง
- CHAT-E2E-E02: การสนทนา multi-turn เก็บ message history ไว้
- CHAT-E2E-E03: Widget ยังใช้งานได้หลังจากการ navigate ระหว่างหน้า

---

### tests/e2e/checkout.e2e.spec.ts (19 เคส)

- **ภาพรวม:** E2E test ครอบคลุม checkout journey ตั้งแต่ cart handoff จนถึง payment-ready state
- **สรุป:** ตรวจสอบ checkout flow, form completeness, payment readiness และพฤติกรรม block สำหรับตะกร้าว่างหรือ cart state ที่ไม่ถูกต้อง
- **Test flow:** ย้ายจากตะกร้าไปยัง checkout → ตรวจสอบ shipping/coupon/stock/payment readiness → ยืนยันการ block ในเงื่อนไขที่ไม่ถูกต้อง
- **Business logic ที่ตรวจสอบ:** Checkout บังคับใช้ cart validity, การคำนวณ shipping/coupon และ payment readiness guard

**Positive — 9 เคส:**
- CHK-P01: ตั้งค่าตะกร้าด้วย 2 รายการและตรวจสอบ subtotal
- CHK-P02: หน้า checkout แสดง Stripe ready และตะกร้าตรงกันทั้งหมด
- CHK-P03: การชำระเงินด้วย Stripe สำเร็จ redirect ไปยัง success และปรากฏใน profile
- CHK-P04: ออเดอร์ต่ำกว่า 1,000 บาท มีค่าจัดส่ง 50 บาท
- CHK-P05: ออเดอร์ตั้งแต่ 1,000 บาทขึ้นไป จัดส่งฟรี
- CHK-P06: ใช้ WELCOME10 กับออเดอร์มูลค่าต่ำ ยอดรวมอัปเดต
- CHK-P07: ใช้ ROBOT99 กับออเดอร์มูลค่าสูง จัดส่งฟรี
- CHK-P08: ลบ coupon คืนยอดรวมเดิม
- CHK-P09: ช่อง coupon ซ่อนหลังจากใช้งานแล้ว (ป้องกันการใช้ซ้ำ)

**Negative — 6 เคส:**
- CHK-N01: Checkout ตะกร้าว่างถูก block (redirect หรือ protective message)
- CHK-N02: ชื่อว่างป้องกันการ submit (HTML5 validation)
- CHK-N03: Email ไม่ถูกต้องป้องกันการ submit
- CHK-N04: Email ว่างป้องกันการ submit
- CHK-N05: Coupon หมดอายุถูกปฏิเสธ ยอดรวมไม่เปลี่ยน
- CHK-N06: Stock validation ป้องกันไม่ให้ checkout สำเร็จ

**Edge — 4 เคส:**
- CHK-E01: ส่วนลดที่ข้ามเกณฑ์การจัดส่ง คำนวณใหม่ถูกต้อง
- CHK-E02: การเปลี่ยนจำนวนที่ข้ามเกณฑ์ อัปเดต shipping ทันที
- CHK-E03: Subtotal ต่ำกว่าเกณฑ์ยังคงมีค่าจัดส่ง
- CHK-E04: ออเดอร์มูลค่าสูงพร้อม coupon ยังจัดส่งฟรีเมื่อยังสูงกว่าเกณฑ์

---

### tests/e2e/mobile.e2e.spec.ts (12 เคส)

- **ภาพรวม:** Mobile viewport E2E ตรวจสอบ responsive navigation และ purchase flow หลัก
- **สรุป:** ตรวจสอบพฤติกรรม touch-friendly layout, mobile menu interaction และ critical customer action บนหน้าจอขนาดเล็ก
- **Test flow:** รัน shopping flow หลักภายใต้ mobile viewport → ตรวจสอบ menu/touch interaction และ mobile-specific security
- **Business logic ที่ตรวจสอบ:** Commerce behavior หลักต้องคงไว้ในรูปแบบ mobile และ touch navigation

**Positive — 4 เคส:**
- MOBILE-P01: Mobile navigation menu เข้าถึงได้
- MOBILE-P02: เพิ่มสินค้าลงตะกร้าบน mobile viewport ได้
- MOBILE-P03: ดูและอัปเดตจำนวนตะกร้าบน mobile viewport ได้
- MOBILE-P04: หน้า checkout เข้าถึงได้บน mobile

**Negative — 4 เคส:**
- MOBILE-N01: Checkout ตะกร้าว่างถูก block บน mobile
- MOBILE-N02: Coupon ไม่ถูกต้องแสดง validation error บน mobile cart
- MOBILE-N03: Search ที่ไม่มีผลลัพธ์แสดง empty state บน mobile
- MOBILE-N04: Email checkout ไม่ถูกต้องถูก block ด้วย HTML5 validation บน mobile

**Edge — 4 เคส:**
- MOBILE-E01: Product card ยังใช้งานได้บนหน้าจอขนาดเล็ก
- MOBILE-E02: การหมุนเป็น landscape ช่วยให้เข้าถึง checkout flow ได้
- MOBILE-E03: การอัปเดตจำนวนซ้ำ ๆ ยังคงสอดคล้องกันบน mobile cart
- MOBILE-E04: Coupon apply/remove lifecycle ทำงานบน mobile cart

---

### tests/e2e/order-history.e2e.spec.ts (8 เคส)

- **ภาพรวม:** E2E test สำหรับ order history ผ่าน profile orders tab และการเข้าถึง invoice
- **สรุป:** ตรวจสอบ order visibility, ความถูกต้องของ card metadata, authorization boundary และความสอดคล้องใน refresh/order-sorting
- **Test flow:** สร้างออเดอร์ → เปิด profile orders tab → ตรวจสอบ card data, invoice navigation, auth check และพฤติกรรม sorting/refresh
- **Business logic ที่ตรวจสอบ:** User ควรเห็นเฉพาะ order history ของตัวเองที่ถูกต้อง พร้อม metadata และ invoice access ที่ถูกต้อง

**Positive — 4 เคส:**
- ORD-HIST-P01: Orders tab โหลดและแสดงรายการหรือ empty state
- ORD-HIST-P02: ออเดอร์ที่สร้างใหม่แสดงรายละเอียดสินค้าที่ถูกต้อง
- ORD-HIST-P03: Order card แสดง status, วันที่สั่ง และยอดรวม
- ORD-HIST-P04: ลิงก์ดู invoice นำทางไปยังหน้า invoice ของออเดอร์

**Negative — 2 เคส:**
- ORD-HIST-N01: User ที่ไม่ผ่าน authentication ไม่สามารถเข้าถึง order history tab ได้
- ORD-HIST-N02: Order history ว่างแสดง empty state สำหรับ user ใหม่

**Edge — 2 เคส:**
- ORD-HIST-E01: ออเดอร์ใหม่หลายรายการถูก sort โดยล่าสุดขึ้นก่อน
- ORD-HIST-E02: การ refresh orders tab รักษา order visibility ไว้

---

### tests/e2e/search.e2e.spec.ts (8 เคส)

- **ภาพรวม:** E2E test ประสบการณ์การค้นหาครอบคลุมพฤติกรรม query และการแสดงผลลัพธ์
- **สรุป:** ครอบคลุม exact/partial match, whitespace และ long search term handling และความทนทานต่อ input ที่ไม่ปลอดภัยหรือ malformed
- **Test flow:** รัน exact/partial/empty/special-character query → ตรวจสอบ result card, empty state และ query resilience
- **Business logic ที่ตรวจสอบ:** Search handling ต้องปลอดภัยและสม่ำเสมอสำหรับทั้ง input ปกติและ adversarial input

**Positive — 3 เคส:**
- SEARCH-P01: Search ที่ถูกต้องคืน product card ที่ตรงกัน
- SEARCH-P02: Search ไม่ case-sensitive
- SEARCH-P03: Partial name matching คืนสินค้าที่คาดไว้

**Negative — 2 เคส:**
- SEARCH-N01: Search ที่ไม่มีผลลัพธ์แสดง empty state
- SEARCH-N02: Search ว่างคืนรายการ default ที่ไม่ถูก filter

**Edge — 3 เคส:**
- SEARCH-E01: อักขระพิเศษถูกจัดการอย่างปลอดภัย
- SEARCH-E02: คำค้นหาที่มี whitespace หลายช่องจัดการเป็น literal input
- SEARCH-E03: คำค้นหาที่ยาวมากถูกจัดการอย่าง graceful

---

### tests/e2e/stripe.e2e.spec.ts (7 เคส)

- **ภาพรวม:** Stripe-specific E2E test สำหรับ payment UI readiness ในเชิง provider-specific
- **สรุป:** ตรวจสอบความเท่ากันของยอดรวม cart กับ checkout, การมีอยู่ของ Stripe element เมื่อเกี่ยวข้อง และ safe fallback ใน mock mode
- **Test flow:** เข้า checkout จากตะกร้า → เปรียบเทียบยอดรวม → ยืนยัน Stripe vs mock UI พฤติกรรม และ fallback handling
- **Business logic ที่ตรวจสอบ:** Provider-specific payment UI ต้องสอดคล้องกับ payment mode ที่ active และยอดรวมในตะกร้า

**Positive — 3 เคส:**
- STRIPE-P01: Checkout เข้าถึงได้และ payment section เริ่ม initialize แล้ว
- STRIPE-P02: ยอดรวม checkout, รายการสินค้า และ grand total ถูกต้อง
- STRIPE-P03: Stripe SDK และ payment frame โหลดได้ใน Stripe mode

**Negative — 2 เคส:**
- STRIPE-N01: Mock mode แสดง mock payment log แทน Stripe
- STRIPE-N02: ตะกร้าว่าง block การเข้า real checkout

**Edge — 2 เคส:**
- STRIPE-E01: ยอดรวม checkout คงที่หลัง page reload
- STRIPE-E02: Submit button state มีอยู่ทั้งใน Stripe mode และ mock mode

---

### tests/integration/checkout-mock.int.spec.ts (10 เคส)

- **ภาพรวม:** Integration test สำหรับความสอดคล้องระหว่าง cart และ checkout ใน mock payment mode
- **สรุป:** ตรวจสอบการส่งผ่านยอดรวม, shipping, coupon, session continuity และการป้องกันตะกร้าว่างข้ามขอบเขต page/API
- **Test flow:** เชื่อมโยง cart API state ไปยัง checkout UI → ตรวจสอบความสอดคล้องของ total/shipping/coupon/session ข้ามขอบเขต
- **Business logic ที่ตรวจสอบ:** การ integrate ระหว่าง cart กับ checkout ต้องรักษายอดรวม, ส่วนลด และ session continuity ไว้

**Positive — 2 เคส:**
- CHK-INT-P01: ยอดรวม checkout, รายการสินค้า และ grand total สอดคล้องกัน
- CHK-INT-P02: Checkout เริ่ม payment UI สำหรับ active provider

**Negative — 3 เคส:**
- CHK-INT-N01: Checkout block การเข้าถึงตะกร้าว่าง
- CHK-INT-N02: ตะกร้าที่ถูก clear ระหว่าง checkout ถูก block เมื่อ refresh
- CHK-INT-N03: Coupon หมดอายุไม่เปลี่ยนยอดรวมใน checkout

**Edge — 5 เคส:**
- CHK-INT-E01: ออเดอร์ต่ำกว่าเกณฑ์ยังคงมีค่าจัดส่งใน checkout
- CHK-INT-E02: ออเดอร์มูลค่าสูงจัดส่งฟรีใน checkout flow
- CHK-INT-E03: ส่วนลด coupon ที่ถูกต้องคงอยู่จาก cart จนถึง checkout
- CHK-INT-E04: การอัปเดตจำนวนใน cart ส่งผลต่อยอดรวมใน checkout
- CHK-INT-E05: Session หมดอายุ redirect ออกจาก checkout

---

### tests/integration/forgot-reset.int.spec.ts (12 เคส)

- **ภาพรวม:** Integration test สำหรับ forgot/reset password flow ครอบคลุม UI, email inbox และ data persistence
- **สรุป:** ยืนยันกฎ token issuance/rotation/expiry, ความสมบูรณ์ของ reset link และการจัดการ token ที่ไม่ถูกต้องหรือถูกใช้ซ้ำอย่างปลอดภัย
- **Test flow:** รัน forgot/reset ผ่าน UI + inbox + DB token verification → ตรวจสอบ token lifecycle และการจัดการ invalid path อย่างปลอดภัย
- **Business logic ที่ตรวจสอบ:** Reset token lifecycle ต้องปลอดภัย (format, expiry, rotation, single-use)

**Positive — 3 เคส:**
- RESET-INT-P01: Forgot password ส่ง reset link ไปยัง demo inbox
- RESET-INT-P02: Reset email มี subject format ตามที่คาดไว้
- RESET-INT-P03: Reset link ใช้ URL และ token format ที่ถูกต้อง

**Negative — 4 เคส:**
- RESET-INT-N01: Email ที่ไม่มีอยู่แสดงข้อความ success แบบ generic
- RESET-INT-N02: Email format ไม่ถูกต้องถูก block ด้วย HTML5 validation
- RESET-INT-N03: Token reset ที่หมดอายุถูกปฏิเสธ
- RESET-INT-N04: Token reset ที่ใช้แล้วไม่สามารถนำมาใช้ซ้ำได้

**Edge — 5 เคส:**
- RESET-INT-E01: Reset request ซ้ำจะ rotate token สำหรับ user คนเดิม
- RESET-INT-E02: Reset link มี hexadecimal token ใน path parameter
- RESET-INT-E03: Reset link ใช้งานได้จาก browser context ใหม่
- RESET-INT-E04: เนื้อหา reset email มีคำแนะนำในการ reset
- RESET-INT-E05: Token path แบบ query parameter ไม่เป็นที่ยอมรับ

---

### tests/integration/notifications.int.spec.ts (11 เคส)

- **ภาพรวม:** Integration test ระหว่าง notification API response และ dropdown UI state
- **สรุป:** ตรวจสอบ unread count, payload structure ของรายการ, พฤติกรรม mark-all-as-read และการจัดการ unauthorized access ให้ sync กัน
- **Test flow:** เปรียบเทียบ notification payload ของ API กับ dropdown UI → ตรวจสอบ unread count sync, action และพฤติกรรมเมื่อไม่ผ่าน auth
- **Business logic ที่ตรวจสอบ:** Notification count และ payload contract ต้อง sync กันระหว่าง API และ UI

**Positive — 3 เคส:**
- NOTIF-INT-P01: Unread count ใน dropdown สอดคล้องกับ notification list ของ API
- NOTIF-INT-P02: Notification API คืน response structure ตามที่คาดไว้
- NOTIF-INT-P03: Notification object แต่ละรายการมี required field ครบถ้วน

**Negative — 2 เคส:**
- NOTIF-INT-N01: Endpoint notification ที่ไม่ถูกต้องคืน Not Found
- NOTIF-INT-N02: การเข้าถึง Notification API โดยไม่ผ่าน auth ถูก block

**Edge — 6 เคส:**
- NOTIF-INT-E01: การ mark all as read อัปเดต unread count จาก API
- NOTIF-INT-E02: UI จัดการขนาด notification list ที่มีขอบเขตได้
- NOTIF-INT-E03: จำนวนรายการใน dropdown ตรงกับความยาว API list
- NOTIF-INT-E04: Notification count คงสอดคล้องกันในหลาย tab
- NOTIF-INT-E05: Notification timestamp ถูกต้องและไม่เก่าเกินไป
- NOTIF-INT-E06: Pagination query รักษา response contract ให้เสถียร

---

### tests/integration/order-inventory.int.spec.ts (7 เคส)

- **ภาพรวม:** Integration test สำหรับผลกระทบของการสั่งซื้อต่อความสอดคล้องของ inventory และ concurrency
- **สรุป:** ตรวจสอบความถูกต้องของ stock deduction, การป้องกัน oversell, stale cart validation และ controlled error เมื่อ stock หมด
- **Test flow:** สร้างออเดอร์เทียบกับ controlled stock → ตรวจสอบ deduction math, oversell protection และ stale cart re-validation
- **Business logic ที่ตรวจสอบ:** Order success ต้อง deduct stock แบบ atomic โดยไม่มีการ oversell ภายใต้ concurrency

**Positive — 3 เคส:**
- ORD-INV-INT-P01: Stock ลดลงหลังจากสั่งซื้อสำเร็จ
- ORD-INV-INT-P02: การลด stock เท่ากับจำนวนที่สั่ง
- ORD-INV-INT-P03: ออเดอร์ถูกสร้างเมื่อมีจำนวนสินค้าอยู่ใน stock

**Negative — 2 เคส:**
- ORD-INV-INT-N01: ตะกร้าปฏิเสธจำนวนที่สูงกว่า stock ที่มีอยู่
- ORD-INV-INT-N02: การเพิ่มและ checkout ด้วยจำนวน 0 block ได้เมื่อ stock หมด

**Edge — 2 เคส:**
- ORD-INV-INT-E01: Concurrent order ไม่ทำให้เกิด inventory oversell
- ORD-INV-INT-E02: Checkout re-validate stale cart กับ stock ปัจจุบัน

---

### tests/integration/product-cart.int.spec.ts (7 เคส)

- **ภาพรวม:** Integration test สำหรับความถูกต้องของข้อมูล product detail หลังจากเพิ่มลงตะกร้า
- **สรุป:** ตรวจสอบความสอดคล้องของ price/name/image, quantity carryover, repeated add accumulation และพฤติกรรม error ใน stock validation
- **Test flow:** Transfer ข้อมูล product detail ไปยัง cart row → ตรวจสอบความสอดคล้องของ name/price/image/quantity และพฤติกรรม stock rejection
- **Business logic ที่ตรวจสอบ:** Product attribute ต้องถ่ายโอนไปยัง cart state อย่างถูกต้อง โดยมี stock guard บังคับใช้

**Positive — 3 เคส:**
- PROD-CART-INT-P01: ราคาสินค้าตรงกับราคาต่อหน่วยใน cart
- PROD-CART-INT-P02: ชื่อสินค้าถ่ายโอนไปยัง cart row อย่างถูกต้อง
- PROD-CART-INT-P03: จำนวนที่เลือกถูก preserve เมื่อเพิ่มลงตะกร้า

**Negative — 2 เคส:**
- PROD-CART-INT-N01: ไม่สามารถเพิ่มสินค้าที่ out of stock ผ่าน API ได้
- PROD-CART-INT-N02: จำนวนที่สูงกว่า stock ปัจจุบันถูกปฏิเสธ

**Edge — 2 เคส:**
- PROD-CART-INT-E01: Product image mapping ยังคงสอดคล้องกันใน cart
- PROD-CART-INT-E02: การเพิ่มซ้ำจะสะสมจำนวนและยอดรวม

---

### tests/security/authorization.spec.ts (12 เคส)

- **ภาพรวม:** Security authorization test สำหรับ RBAC และขอบเขตความเป็นเจ้าของ
- **สรุป:** ตรวจสอบ route protection สำหรับ anon/user/admin, ข้อจำกัดทางธุรกิจของ admin, invalid logout และ invoice ownership isolation
- **Test flow:** ตรวจสอบ route/endpoint ด้วย anon/user/admin context → ตรวจสอบ RBAC, ownership verification และ session invalidation
- **Business logic ที่ตรวจสอบ:** Least-privilege access และ ownership boundary ต้องคงอยู่ตลอดการเปลี่ยน role

**Positive — 2 เคส:**
- AUTHZ-P01: Admin เข้าถึง admin dashboard และ admin notification API ได้
- AUTHZ-P02: User ที่ authenticated เข้าถึง resource ของตัวเองได้

**Negative — 7 เคส:**
- AUTHZ-N01: Anonymous user ถูก redirect จาก notification API
- AUTHZ-N02: User ทั่วไปถูกห้ามจาก admin notification API
- AUTHZ-N03: Admin dashboard ปฏิเสธ anonymous และ regular user
- AUTHZ-N04: Admin ถูก block จาก cart add API
- AUTHZ-N05: Stock reset endpoint ปฏิเสธ request ที่ไม่มี reset key
- AUTHZ-N06: Logout ทำให้การเข้าถึง protected API เป็นโมฆะ
- AUTHZ-N07: Anonymous user ไม่สามารถเข้าถึงหน้า profile orders ได้

**Edge — 3 เคส:**
- AUTHZ-E01: การเข้าถึง invoice จำกัดเฉพาะเจ้าของออเดอร์
- AUTHZ-E02: Invoice ID ไม่ถูกต้องคืน 404 โดยไม่มี stack trace รั่วไหล
- AUTHZ-E03: Role switch ใน authorization อัปเดต API context เดียวกัน

---

### tests/security/chat.security.spec.ts (8 เคส)

- **ภาพรวม:** Security-focused chat test สำหรับ prompt injection resistance และพฤติกรรม endpoint ที่เข้มงวด
- **สรุป:** ครอบคลุม sensitive prompt ที่ถูก block, malformed request handling, leak protection verification และความสอดคล้องใน auth state
- **Test flow:** ส่ง inappropriate/malformed chat input → ยืนยัน rejection, non-leakage และพฤติกรรมที่เสถียรใน auth state ต่าง ๆ
- **Business logic ที่ตรวจสอบ:** Prompt injection ต้องถูก block โดยไม่ทำให้ข้อมูลภายในที่ sensitive รั่วไหล

**Positive — 2 เคส:**
- CHAT-SEC-P01: Password/credential extraction prompt ถูก block
- CHAT-SEC-P02: Credit card data extraction prompt ถูก block

**Negative — 3 เคส:**
- CHAT-SEC-N01: SQL-like prompt ไม่ทำให้เกิด server error
- CHAT-SEC-N02: Malformed JSON payload ถูกปฏิเสธโดยไม่มี 5xx
- CHAT-SEC-N03: GET method tampering ไม่ถูก expose

**Edge — 3 เคส:**
- CHAT-SEC-E01: Malicious prompt ถูก block
- CHAT-SEC-E02: Blocked output ไม่ทำให้ sensitive keyword รั่วไหล
- CHAT-SEC-E03: Block behavior สอดคล้องกันสำหรับทั้ง anonymous และ logged-in user

---

### tests/security/headers.security.spec.ts (12 เคส)

- **ภาพรวม:** Security header verification สำหรับหน้าหลักและ API พร้อม environment-aware strictness
- **สรุป:** ตรวจสอบ basic hardening header, safe header value, CORS/CSP/HSTS expectation และ error response ที่ไม่รั่วไหล
- **Test flow:** Request หน้าสำคัญ/API → ตรวจสอบ security header และ error response → บังคับใช้ environment-aware strictness
- **Business logic ที่ตรวจสอบ:** Response header ต้องบังคับใช้ basic web hardening และหลีกเลี่ยง insecure configuration

**Positive — 6 เคส:**
- SEC-HDR-P01: Route หลักคืน non-5xx response
- SEC-HDR-P02: API สำคัญคืน non-5xx response
- SEC-HDR-P03: Production target มี basic security header
- SEC-HDR-P04: CORS credential ไม่ถูก pair กับ wildcard origin
- SEC-HDR-P05: CSP directive หลีกเลี่ยง dangerous pattern ที่ชัดเจน
- SEC-HDR-P06: HSTS มี max-age เมื่อมีอยู่

**Negative — 3 เคส:**
- SEC-HDR-N01: `x-content-type-options` เข้มงวดเมื่อมีอยู่
- SEC-HDR-N02: `x-frame-options` block การ frame เมื่อมีอยู่
- SEC-HDR-N03: Referrer policy หลีกเลี่ยง unsafe URL เมื่อมีอยู่

**Edge — 3 เคส:**
- SEC-HDR-E01: Not Found response ไม่ทำให้ stack trace รั่วไหล
- SEC-HDR-E02: Header value ไม่ว่างเปล่าเมื่อมีการระบุ
- SEC-HDR-E03: Permission policy มีข้อจำกัดเมื่อมีอยู่

---

### tests/security/input-hardening.security.spec.ts (5 เคส)

- **ภาพรวม:** Security test สำหรับ input hardening กับ injection-like payload และ malformed identifier
- **สรุป:** ตรวจสอบว่า authentication และ protected endpoint ป้องกัน tampering ได้ ขณะที่คืน controlled 4xx response โดยไม่มี stack leak
- **Test flow:** ส่ง injection/tampering payload → ตรวจสอบ controlled rejection และไม่มี stack/privilege leak
- **Business logic ที่ตรวจสอบ:** Input tampering ควรล้มเหลวอย่างปลอดภัยด้วย controlled 4xx output และไม่มีการ expose ข้อมูลภายใน

**Positive — 1 เคส:**
- SEC-INP-P01: Login ที่ถูกต้องยังทำงานได้หลังจากความพยายาม malicious ล้มเหลว

**Negative — 3 เคส:**
- SEC-INP-N01: SQL/XSS-like login payload ถูกปฏิเสธ
- SEC-INP-N02: Admin endpoint query tampering ไม่ข้ามการ role check
- SEC-INP-N03: Anonymous query tampering ไม่ bypass auth ของ protected API

**Edge — 1 เคส:**
- SEC-INP-E01: Invoice ID ที่ malformed คืน controlled 4xx โดยไม่มี stack leak