import { APIResponse, expect } from '@playwright/test';
import { readJson } from '@api/http';
import type { ApiResponse } from '@app-types/app.types';

// assert ว่า status ตรงตามที่คาด
export const expectStatus = (res: APIResponse, status: number) => {
  expect(res.status(), `Expected status ${status} but got ${res.status()}`).toBe(status);
};

// assert ว่า response ok (2xx)
export const expectOk = (res: APIResponse) => {
  expect(res.ok(), `Expected response.ok() to be true but got ${res.status()}`).toBeTruthy();
};

// ตรวจรูปแบบ response ที่เป็นมาตรฐาน (ok/status)
export const expectApiSuccess = async <T = unknown>(res: APIResponse) => {
  const body = await readJson<ApiResponse<T>>(res);
  const ok = body.ok === true || body.status === 'ok' || body.status === 'success';
  expect(ok, `Expected API response to be ok/success but got ${body.status ?? 'unknown'}`).toBeTruthy();
  return body;
};

// ใช้เช็ค error response
export const expectApiError = async (res: APIResponse) => {
  const body = await readJson<ApiResponse>(res);
  const ok = body.ok === true || body.status === 'ok' || body.status === 'success';
  expect(ok, 'Expected API response to be error but got ok/success').toBeFalsy();
  return body;
};
