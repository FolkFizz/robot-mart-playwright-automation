# Tagging Convention

ใช้ `@tag` ในชื่อเทส เพื่อคุมชุดรันและความเร็ว

## Tag หลัก
- `@smoke` : ชุดทดสอบเร็วที่สุด (PR)
- `@regression` : ชุดทดสอบเต็ม (nightly)
- `@api` : API tests
- `@a11y` : Accessibility tests
- `@security` : Security tests
- `@perf` : Performance/Load (เช่น k6)

## Tag เฉพาะเคส
- `@stripe` : เคส Stripe จริง
- `@chaos` : เคส Chaos Lab
- `@ai` : เคส AI/Chat

## ตัวอย่าง
```ts
test('checkout with coupon @smoke @e2e', async () => {
  // ...
});
```
