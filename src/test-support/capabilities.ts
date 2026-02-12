const PLACEHOLDER_VALUES = new Set([
  'ci-placeholder',
  'placeholder',
  'changeme',
  'change-me',
  'change_me'
]);

const toBool = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'y', 'on'].includes(value.toLowerCase());
};

const readTrimmed = (name: string): string => {
  return process.env[name]?.trim() || '';
};

const isPlaceholderValue = (value: string): boolean => {
  return PLACEHOLDER_VALUES.has(value.toLowerCase());
};

const resolveBaseUrl = (): string => {
  return readTrimmed('APP_BASE_URL') || readTrimmed('BASE_URL') || 'http://localhost:3000';
};

const isLocalTarget = (): boolean => {
  const baseUrl = resolveBaseUrl();
  try {
    const { hostname } = new URL(baseUrl);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
  }
};

export const hasRealSecret = (envName: string): boolean => {
  const value = readTrimmed(envName);
  return value.length > 0 && !isPlaceholderValue(value);
};

export const canRunPrivilegedStockTests = (secretEnvName: string): boolean => {
  if (!hasRealSecret(secretEnvName)) return false;
  if (isLocalTarget()) return true;
  return toBool(process.env.ALLOW_DESTRUCTIVE_TEST_HOOKS, false);
};

export const privilegedStockSkipReason = (secretEnvName: string): string => {
  return (
    `Requires a real ${secretEnvName} and a local target URL by default. ` +
    `For hosted runs, set ALLOW_DESTRUCTIVE_TEST_HOOKS=true intentionally.`
  );
};
