import { env } from '@config/constants';

const pickEnv = (key: string, fallback: string): string => {
  const value = process.env[key];
  if (!value || value.trim().length === 0) return fallback;
  return value.trim();
};

export const testEmailDomain = pickEnv('TEST_EMAIL_DOMAIN', 'example.com');

export const buildTestEmail = (localPart: string): string => {
  return `${localPart}@${testEmailDomain}`;
};

export const buildNonExistentEmail = (suffix: string): string => {
  return buildTestEmail(`nonexistent-${suffix}`);
};

export const isolatedUserPassword = pickEnv('TEST_ISOLATED_USER_PASSWORD', env.user.password);

export const resetTestData = {
  nonExistentEmail: pickEnv('TEST_NON_EXISTENT_EMAIL', buildTestEmail('nonexistent')),
  invalidToken: pickEnv('TEST_INVALID_RESET_TOKEN', 'invalid_token_12345'),
  newPassword: pickEnv('TEST_RESET_NEW_PASSWORD', `${isolatedUserPassword}_new`),
  mismatchPassword: pickEnv('TEST_RESET_MISMATCH_PASSWORD', `${isolatedUserPassword}_mismatch`)
} as const;

export const securityTestData = {
  invalidResetKey: pickEnv('TEST_INVALID_RESET_KEY', 'INVALID_RESET_KEY')
} as const;
