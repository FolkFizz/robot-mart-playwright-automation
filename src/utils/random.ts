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

// --- เพิ่ม helper ใหม่ ---

export const randomUsername = (prefix = 'auto') => {
  return `${prefix}_${randomString(6)}`;
};

export const randomPassword = (length = 10) => {
  return randomString(length);
};

// สร้างคู่ password/confirm (mismatch ได้)
export const randomPasswordPair = (mismatch = false) => {
  const password = randomPassword();
  const confirmPassword = mismatch ? randomPassword() : password;
  return { password, confirmPassword };
};

// สร้าง user สำหรับ register
export const randomUser = (prefix = 'auto') => {
  const username = randomUsername(prefix);
  const email = randomEmail(prefix);
  const { password, confirmPassword } = randomPasswordPair(false);
  return { username, email, password, confirmPassword };
};
