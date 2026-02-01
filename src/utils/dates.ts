// helper วันที่/เวลา

// คืนค่า ISO string ของเวลา ณ ตอนนี้
export const nowIso = () => new Date().toISOString();

// แปลงเป็นวันที่แบบอ่านง่าย (en-US)
export const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US');
};

// แปลงเป็นวันที่+เวลา (en-US)
export const formatDateTime = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US');
};

// แสดงเวลาใน timezone Bangkok (ให้ตรงกับ UI sandbox)
export const formatBangkok = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
};
