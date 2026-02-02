# Environments & .env

ไฟล์ `.env` ใช้ควบคุม environment สำหรับการรันเทส/เครื่องมือ

## ตัวแปรสำคัญ
- `BASE_URL` : URL ของระบบที่ต้องการทดสอบ
- `TEST_API_KEY` : ใช้เรียก `/api/test/seed` และ `/api/test/reset`
- `RESET_KEY` : ใช้ endpoint reset stock (ถ้าจำเป็น)
- `USER_USERNAME`, `USER_PASSWORD` : user สำหรับทดสอบ
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` : admin สำหรับทดสอบ
- `CHAOS_ENABLED` : เปิด/ปิด chaos โดยค่าเริ่มต้น (true/false)
- `PAYMENT_MOCK` : mock/stripe (ถ้า UI รองรับโหมด mock)

## ตัวอย่าง .env
```env
BASE_URL=http://localhost:3000
TEST_API_KEY=mytestkey
RESET_KEY=resetkey
USER_USERNAME=user
USER_PASSWORD=user123
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
CHAOS_ENABLED=false
PAYMENT_MOCK=mock
```
