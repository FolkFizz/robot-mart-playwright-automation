export const app = {
    // Priority: 
    // 1. REAL_URL (Direct Production URL from .env)
    // 2. BASE_URL (Standard Plaawright URL)
    // 3. Default fallback
    baseURL: __ENV.REAL_URL || __ENV.BASE_URL || 'http://localhost:3000',
    
    // Limits
    maxResponseTime: 500, // ms
};

// Log the target for debugging (visible in k6 stdout)
if (__ENV.REAL_URL) {
    console.log(`[Config] Target: PRODUCTION (${app.baseURL})`);
} else {
    console.log(`[Config] Target: ${app.baseURL}`);
}
