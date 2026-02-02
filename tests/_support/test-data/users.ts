import { env } from '@config/env';

export const users = {
  admin: {
    username: env.admin.username,
    password: env.admin.password,
    role: 'admin' as const
  },
  user: {
    username: env.user.username,
    password: env.user.password,
    role: 'user' as const
  },
  invalid: {
    username: 'invalid_user',
    password: 'wrong_password'
  }
};
