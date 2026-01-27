// tests/integration/api.spec.ts
import { test, expect } from '@playwright/test';
import { generateUser } from '../helpers/user-helper';

test.describe('API Integration Tests', () => {
    
  test('POST /api/products/reset-stock should reset stock with correct key', async ({ request }) => {
    const res = await request.post('/api/products/reset-stock', {
      headers: { 'X-RESET-KEY': 'resetstock2026' }
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('POST /api/products/reset-stock should fail without key', async ({ request }) => {
    const res = await request.post('/api/products/reset-stock');
    expect(res.status()).toBe(403);
  });

});
