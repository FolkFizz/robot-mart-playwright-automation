const pickEnv = (key, fallback) => {
    const value = __ENV[key];
    return value && String(value).length > 0 ? String(value) : fallback;
};

export const app = {
    // Priority:
    // 1. REAL_URL (Direct Production URL from .env)
    // 2. BASE_URL (Standard Playwright URL)
    // 3. Default fallback
    baseURL: __ENV.REAL_URL || __ENV.BASE_URL || 'http://localhost:3000',

    // Limits
    maxResponseTime: 500, // ms
};

const perfPassword = pickEnv('PERF_PASSWORD', pickEnv('USER_PASSWORD', ''));

export const perfAuth = {
    username: pickEnv('PERF_USER', pickEnv('USER_USERNAME', 'user')),
    password: perfPassword,
    autoRegisterPassword: pickEnv('PERF_AUTO_REGISTER_PASSWORD', perfPassword),
    emailDomain: pickEnv('PERF_EMAIL_DOMAIN', pickEnv('TEST_EMAIL_DOMAIN', 'example.com')),
};
