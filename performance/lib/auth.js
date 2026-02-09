import http from 'k6/http';
import { check } from 'k6';
import { app } from './config.js';
import { headers } from './http.js';

export function login(username, password) {
    const payload = {
        username: username,
        password: password,
    };

    const res = http.post(`${app.baseURL}/login`, payload, {
        headers: headers.form,
    });

    check(res, {
        'login successful': (r) => r.status === 200 || r.status === 302,
    });

    return res;
}
