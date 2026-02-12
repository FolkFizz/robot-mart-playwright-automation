const pickEnv = (key, fallback) => {
  const value = __ENV[key];
  return value && String(value).length > 0 ? String(value) : fallback;
};

const resolvePerfBaseUrl = () => {
  if (__ENV.K6_BASE_URL && String(__ENV.K6_BASE_URL).length > 0) {
    return { value: String(__ENV.K6_BASE_URL), source: 'K6_BASE_URL' };
  }
  if (__ENV.APP_BASE_URL && String(__ENV.APP_BASE_URL).length > 0) {
    return { value: String(__ENV.APP_BASE_URL), source: 'APP_BASE_URL' };
  }
  if (__ENV.BASE_URL && String(__ENV.BASE_URL).length > 0) {
    return { value: String(__ENV.BASE_URL), source: 'BASE_URL (legacy)' };
  }
  if (__ENV.PERF_BASE_URL && String(__ENV.PERF_BASE_URL).length > 0) {
    return { value: String(__ENV.PERF_BASE_URL), source: 'PERF_BASE_URL (legacy)' };
  }
  if (__ENV.REAL_URL && String(__ENV.REAL_URL).length > 0) {
    return { value: String(__ENV.REAL_URL), source: 'REAL_URL (legacy)' };
  }
  return { value: 'http://localhost:3000', source: 'default' };
};

const perfTarget = resolvePerfBaseUrl();

export const app = {
  // Priority:
  // 1. K6_BASE_URL (k6-only override)
  // 2. APP_BASE_URL (shared target with Playwright)
  // 3. BASE_URL / PERF_BASE_URL / REAL_URL (legacy compatibility)
  // 4. Default fallback
  baseURL: perfTarget.value,
  baseURLSource: perfTarget.source,

  // Limits
  maxResponseTime: 500 // ms
};

const perfPassword = pickEnv('PERF_PASSWORD', pickEnv('USER_PASSWORD', ''));

export const perfAuth = {
  username: pickEnv('PERF_USER', pickEnv('USER_USERNAME', 'user')),
  password: perfPassword,
  autoRegisterPassword: pickEnv('PERF_AUTO_REGISTER_PASSWORD', perfPassword),
  emailDomain: pickEnv('PERF_EMAIL_DOMAIN', pickEnv('TEST_EMAIL_DOMAIN', 'example.com'))
};
