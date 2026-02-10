import { users } from './users';
import { resetTestData } from './test-secrets';

const pickEnv = (key: string, fallback: string): string => {
  const value = process.env[key];
  if (!value || value.trim().length === 0) return fallback;
  return value.trim();
};

export const authInputs = {
  wrongPassword: pickEnv('TEST_WRONG_PASSWORD', users.invalid.password),
  wrongUsername: pickEnv('TEST_WRONG_USERNAME', users.invalid.username),
  duplicateEmail: users.user.email,
  duplicatePassword: users.user.password,
  nonExistentEmail: resetTestData.nonExistentEmail,
  invalidResetToken: resetTestData.invalidToken,
  loginLinkText: 'Log in'
} as const;

export const authErrors = {
  invalidCredentials: 'Invalid username or password',
  passwordMismatch: 'Passwords do not match',
  duplicateUser: 'Username or Email already exists'
} as const;

export const inboxSubjects = {
  resetPassword: 'Reset Your Password',
  orderConfirmation: 'Order Confirmation',
  welcome: 'Welcome to Robot Store'
} as const;
