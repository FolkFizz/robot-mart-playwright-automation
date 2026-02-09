import { env } from '@config/constants';

export const users = {
  user: {
    username: 'user',
    password: 'user123',
    email: 'user@robotstore.com',
    role: 'user' as const
  },
  admin: {
    username: 'admin',
    password: 'admin123',
    email: 'admin@robotstore.com',
    role: 'admin' as const
  },
  invalid: {
    username: 'invalid_user',
    password: 'wrong_password'
  }
} as const;
