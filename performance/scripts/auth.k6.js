import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { app } from '../lib/config.js';
import { ramping } from '../scenarios/index.js';
import { headers } from '../lib/http.js';

/**
 * =============================================================================
 * AUTH PERFORMANCE TEST - Session Gate Stability
 * =============================================================================
 *
 * Flow per iteration:
 * 1) Submit form login
 * 2) Verify authenticated access to /profile
 *
 * Why this test exists:
 * - Auth is a hard dependency for cart/checkout scripts.
 * - It isolates login/session regressions from inventory or order side effects.
 * =============================================================================
 */

const loginSuccess = new Counter('login_success');
const loginRejected = new Counter('login_rejected');
const profileSuccess = new Counter('profile_success');
const authUnexpected = new Counter('auth_unexpected');

const TEST_USER = {
    username: __ENV.PERF_USER || 'user',
    password: __ENV.PERF_PASSWORD || 'user123',
};

export const options = {
    scenarios: {
        auth: ramping,
    },
    thresholds: {
        'http_req_duration{endpoint:auth_login}': ['p(95)<1000'],
        'http_req_failed{endpoint:auth_login}': ['rate<0.01'],
        auth_unexpected: ['count==0'],
        profile_success: ['count>0'],
    },
};

function getLocation(res) {
    return String((res && (res.headers.Location || res.headers.location)) || '');
}

function isAuthRedirect(res) {
    if (!res || (res.status !== 302 && res.status !== 303)) {
        return false;
    }
    return getLocation(res).includes('/login');
}

export default function () {
    const loginRes = group('Login', () =>
        http.post(
            `${app.baseURL}/login`,
            {
                username: TEST_USER.username,
                password: TEST_USER.password,
            },
            {
                headers: headers.form,
                redirects: 0,
                tags: { endpoint: 'auth_login' },
                responseCallback: http.expectedStatuses(200, 302, 303),
            }
        )
    );

    const loginOk = check(loginRes, {
        'login status is 200/302/303': (r) => r.status === 200 || r.status === 302 || r.status === 303,
        'login not redirected back to /login': () =>
            loginRes.status === 200 || !getLocation(loginRes).includes('/login'),
    });

    if (!loginOk) {
        authUnexpected.add(1);
        sleep(1);
        return;
    }

    loginSuccess.add(1);

    const profileRes = group('Profile Access', () =>
        http.get(`${app.baseURL}/profile`, {
            redirects: 0,
            tags: { endpoint: 'auth_profile' },
            responseCallback: http.expectedStatuses(200, 302, 303),
        })
    );

    const profileOk = check(profileRes, {
        'profile is accessible after login': (r) => r.status === 200,
    });

    if (profileOk) {
        profileSuccess.add(1);
        sleep(1);
        return;
    }

    if (isAuthRedirect(profileRes)) {
        loginRejected.add(1);
        sleep(1);
        return;
    }

    authUnexpected.add(1);
    sleep(1);
}
