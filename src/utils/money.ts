// Money/price utility helpers.

// Convert "$1,234.50" -> 1234.5.
export const parseMoney = (value: string): number => {
  const cleaned = value.replace(/[^0-9.-]+/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

// Convert a number -> "$1,234.50".
export const formatMoney = (value: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(value);
};

// Strip currency symbols and keep numeric characters (returns string).
export const stripCurrency = (value: string): string => {
  return value.replace(/[^0-9.-]+/g, '');
};
