import http from 'k6/http';
import { check, sleep } from 'k6';
import { app } from '../lib/config.js';
import { smoke } from '../scenarios/smoke.js';

export const options = {
    scenarios: { smoke },
    thresholds: {
        http_req_duration: [`p(95)<${app.maxResponseTime}`], // 95% of requests should be fast
        http_req_failed: ['rate<0.01'],   // 99% success rate
    },
};

export default function () {
    // Test the Home Page
    const res = http.get(`${app.baseURL}/`);
    
    check(res, {
        'status is 200': (r) => r.status === 200,
        'response time OK': (r) => r.timings.duration < app.maxResponseTime,
    });
    
    sleep(1);
}
