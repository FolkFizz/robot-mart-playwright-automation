import { env } from '@config/constants';

const pickEnv = (key: string, fallback: string): string => {
  const value = process.env[key];
  if (!value || value.trim().length === 0) return fallback;
  return value.trim();
};

const userEmail = pickEnv('USER_EMAIL', `${env.user.username}@robotstore.com`);
const adminEmail = pickEnv('ADMIN_EMAIL', `${env.admin.username}@robotstore.com`);

export const users = {
  user: {
    username: env.user.username,
    password: env.user.password,
    email: userEmail,
    role: 'user' as const
  },
  admin: {
    username: env.admin.username,
    password: env.admin.password,
    email: adminEmail,
    role: 'admin' as const
  },
  invalid: {
    username: pickEnv('TEST_INVALID_USERNAME', 'invalid_user'),
    password: pickEnv('TEST_INVALID_PASSWORD', `${env.user.password}_wrong`)
  }
} as const;
