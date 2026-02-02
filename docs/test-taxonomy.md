# Test Taxonomy

โครงสร้างการแบ่งชนิดเทสของโปรเจคนี้

## Functional
- `tests/functional/api` : ทดสอบ API ด้วย request context
- `tests/functional/integration` : ทดสอบ flow ที่เชื่อมหลายส่วน (API + UI)
- `tests/functional/e2e` : ทดสอบ User Journey แบบครบเส้นทาง

## Non-functional
- `tests/non-functional/a11y` : Accessibility (axe)
- `tests/non-functional/security` : Security checks เบื้องต้น
- `tests/non-functional/perf` : Performance/Load (ถ้ามี)

## เป้าหมาย
- แยกประเภทให้ชัด → เลือกรันเฉพาะกลุ่มได้
- ใช้ tag เพื่อคุมชุดเทสใน CI
