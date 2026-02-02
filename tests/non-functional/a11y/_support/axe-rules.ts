// กำหนดกติกา/เงื่อนไข a11y พื้นฐานสำหรับทั้งชุดเทส

export const a11yTags = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa'
];

// รายการ selector ที่มักก่อ noise ในผล a11y (เช่น chaos widget)
export const a11yExcludeSelectors = [
  '#chaos-widget',
  '.chaos-widget'
];

// ปรับ enable/disable rule เป็นรายตัวได้
export const a11yRules: Record<string, { enabled: boolean }> = {
  // ตัวอย่าง: ถ้าต้องการปิดสีคอนทราสต์ให้ใส่ false
  // 'color-contrast': { enabled: false }
};

// ยกเว้น violation บางตัวที่ยอมรับชั่วคราวได้ (ถ้ามี)
export const allowedViolationIds: string[] = [];
