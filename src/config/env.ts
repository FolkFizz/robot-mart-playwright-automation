import dotenv from 'dotenv';

// โหลด env ให้พร้อมใช้งานในทุกที่
dotenv.config();

// -------------------------------------------------------------
// Helper Functions
// -------------------------------------------------------------

// 1. แปลงค่า string -> boolean แบบปลอดภัย (เหมือนเดิม)
const toBool = (value: string | undefined, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase());
};

// 2. อ่านค่าแบบ "Optional" (มี Default ได้)
const getEnv = (key: string, fallback: string) => {
  const value = process.env[key];
  return value && value.length > 0 ? value : fallback;
};

// 3. อ่านค่าแบบ "Required" (บังคับต้องมี) - ใช้สำหรับ Keys/Credentials
const getEnvRequired = (key: string) => {
  const value = process.env[key];
  if (!value || value.length === 0) {
    // โยน Error ทันทีเพื่อหยุดการทำงาน ถ้าลืมใส่ค่าเหล่านี้
    throw new Error(`❌ Configuration Error: Missing required environment variable '${key}'. Please check your .env file.`);
  }
  return value;
};

// -------------------------------------------------------------
// Env Configuration
// -------------------------------------------------------------

export const env = {
  // URL หลักของเว็บ (ใช้ใน Playwright baseURL หรือ API calls)
  baseUrl: getEnv('BASE_URL', 'http://localhost:3000'),

  // API Keys: บังคับต้องมี (ใช้ getEnvRequired)
  testApiKey: getEnvRequired('TEST_API_KEY'),
  resetKey: getEnvRequired('RESET_KEY'),

  // Feature Flags: ถ้าไม่ตั้งค่า ให้ถือว่าปิด (False) ไว้ก่อน
  chaosEnabled: toBool(process.env.CHAOS_ENABLED, false),

  // Credentials: บังคับดึงจาก Env 
  user: {
    username: getEnvRequired('USER_USERNAME'),
    password: getEnvRequired('USER_PASSWORD')
  },
  admin: {
    username: getEnvRequired('ADMIN_USERNAME'),
    password: getEnvRequired('ADMIN_PASSWORD')
  }
};

export type Env = typeof env;