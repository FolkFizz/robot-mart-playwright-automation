import { check } from 'k6';

export const checks = {
    is200: (res) => check(res, { 'status is 200': (r) => r.status === 200 }),
    isSuccess: (res) => check(res, { 'status is 2xx': (r) => r.status >= 200 && r.status < 300 }),
};
