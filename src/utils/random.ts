// helper สุ่มค่าแบบต่าง ๆ

export const randomInt = (min: number, max: number) => {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  return Math.floor(Math.random() * (high - low + 1)) + low;
};

export const randomString = (length = 8) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const randomEmail = (prefix = 'user') => {
  return `${prefix}.${randomString(6)}@example.com`;
};
