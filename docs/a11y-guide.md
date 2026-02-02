# A11y Guide (axe)

เอกสารสรุปการเขียน/รัน A11y tests ด้วย `axe` สำหรับโปรเจคนี้

## สิ่งที่ต้องมี
- ติดตั้งแพ็กเกจ: `@axe-core/playwright`
- ใช้ helper ใน `tests/non-functional/a11y/_support`

## โครงสร้างที่เกี่ยวข้อง
- `src/fixtures/a11y.fixture.ts` (fixture สำหรับ a11y)
- `tests/non-functional/a11y/_support/axe-runner.ts` (รัน axe)
- `tests/non-functional/a11y/_support/axe-rules.ts` (กติกา/ข้อยกเว้น)

## วิธีรัน
```bash
npx playwright test tests/non-functional/a11y --grep "@a11y"
```

## ตัวอย่างการใช้
```ts
import { test } from '@fixtures/a11y.fixture';

test('home a11y @a11y', async ({ page, runA11y, expectNoA11yViolations }) => {
  await page.goto('/');
  const results = await runA11y(page);
  expectNoA11yViolations(results);
});
```

## ปรับกติกา/ยกเว้น
ไปที่ `tests/non-functional/a11y/_support/axe-rules.ts` แล้วแก้:
- `a11yExcludeSelectors` เพื่อ ignore UI บางส่วน (เช่น chaos widget)
- `a11yRules` เพื่อ enable/disable rule
- `allowedViolationIds` สำหรับรายการที่ยอมรับชั่วคราว
