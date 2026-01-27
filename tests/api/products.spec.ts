import { test, expect } from '@playwright/test';

test.describe('Product API', () => {

  test('POST /api/products/reset-stock should reset stock with correct key', async ({ request }) => {
    const res = await request.post('/api/products/reset-stock', {
      headers: { 'X-RESET-KEY': process.env.RESET_KEY || '' }
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test('POST /api/products/reset-stock should fail without key', async ({ request }) => {
    const res = await request.post('/api/products/reset-stock');
    expect(res.status()).toBe(403);
  });

  test('GET /api/products should return list', async ({ request }) => {
    const res = await request.get('/api/products');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products.length).toBeGreaterThan(0);
  });

  test('GET /api/products?q=SearchTerm should filter results', async ({ request }) => {
    // Assuming 'Rusty-Bot 101' exists from seed
    const res = await request.get('/api/products?q=Rusty');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.products.some((p: any) => p.name.includes('Rusty'))).toBe(true);
  });

});
