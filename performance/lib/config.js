export const app = {
    // Priority:
    // 1. REAL_URL (Direct Production URL from .env)
    // 2. BASE_URL (Standard Playwright URL)
    // 3. Default fallback
    baseURL: __ENV.REAL_URL || __ENV.BASE_URL || 'http://localhost:3000',

    // Limits
    maxResponseTime: 500, // ms
};
