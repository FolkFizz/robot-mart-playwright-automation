import { APIResponse, expect } from '@playwright/test';

export type HeaderMap = Record<string, string>;

const normalizeHeaders = (headers: HeaderMap) => {
  const out: HeaderMap = {};
  Object.entries(headers).forEach(([key, value]) => {
    out[key.toLowerCase()] = value;
  });
  return out;
};

export const defaultSecurityHeaders = [
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'content-security-policy'
];

export const getMissingSecurityHeaders = (headers: HeaderMap, required = defaultSecurityHeaders) => {
  const normalized = normalizeHeaders(headers);
  return required.filter((header) => !normalized[header]);
};

export const expectSecurityHeaders = (headers: HeaderMap, required = defaultSecurityHeaders) => {
  const missing = getMissingSecurityHeaders(headers, required);
  expect(missing, `Missing security headers: ${missing.join(', ')}`).toEqual([]);
};

export const expectNoServerError = (res: APIResponse) => {
  expect(res.status(), 'Expected not to be 5xx').toBeLessThan(500);
};
