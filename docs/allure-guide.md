# Allure Guide

เอกสารสรุปการใช้งาน Allure report สำหรับโปรเจคนี้

## สิ่งที่ต้องมี
- ติดตั้ง `allure-playwright` (อยู่ใน `devDependencies` แล้ว)
- ติดตั้ง Allure CLI (ถ้าจะเปิดรายงาน)

## รันเทสพร้อมสร้างผลลัพธ์
```bash
npx playwright test
```

## สร้างรายงาน
```bash
npm run report:allure
```

## เปิดรายงาน
```bash
npm run report:open
```

## แนวทางแนบไฟล์ประกอบ
ใช้ helper ใน `src/utils/allure.ts` เพื่อแนบข้อมูลลงรายงาน เช่น:
- attachText
- attachJson
- attachScreenshot

ถ้าไม่ติดตั้ง Allure จริง ระบบจะไม่พัง เพราะใช้ dynamic import อยู่แล้ว
