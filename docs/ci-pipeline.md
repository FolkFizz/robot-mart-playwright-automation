# CI Pipeline

สรุปภาพรวม workflow ที่ใช้ใน GitHub Actions

## ไฟล์หลัก
- `.github/workflows/ui-smoke.yml`
- `.github/workflows/api.yml`
- `.github/workflows/a11y.yml`
- `.github/workflows/regression-nightly.yml`
- `.github/workflows/k6-nightly.yml`

## แนวคิด
- แยกชนิดการทดสอบตามโฟลเดอร์และ tag
- Smoke รันเร็วสุด ใช้สำหรับ PR
- Regression และ k6 รันแบบ schedule

## ตัวอย่างคำสั่งที่ใช้ใน CI
- UI Smoke:
  ```bash
  npx playwright test --grep "@smoke" --grep-invert "@stripe|@chaos|@ai"
  ```
- API:
  ```bash
  npx playwright test tests/functional/api --grep "@api"
  ```
- A11y:
  ```bash
  npx playwright test tests/non-functional/a11y --grep "@a11y"
  ```
