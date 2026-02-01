// helper สำหรับตัวเลขเงิน

// แปลง "$1,234.50" -> 1234.5
export const parseMoney = (value: string): number => {
  const cleaned = value.replace(/[^0-9.-]+/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

// แปลงตัวเลข -> "$1,234.50"
export const formatMoney = (value: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(value);
};

// ตัดสัญลักษณ์ออกให้เหลือเลข (คืน string)
export const stripCurrency = (value: string): string => {
  return value.replace(/[^0-9.-]+/g, '');
};
