import { test, expect } from '@playwright/test';

test.describe('Cart API', () => {

  // Use a fresh context for each test to have a clean session
  test('Cart Lifecycle: Add -> Update -> Delete', async ({ request }) => {
    
    // 1. Get a product ID first
    const productsRes = await request.get('/api/products');
    const products = (await productsRes.json()).products;
    const product = products[0];
    const productId = product.id;

    // 2. Add to Cart
    const addRes = await request.post('/api/cart/items', {
      data: { productId, quantity: 1 }
    });
    expect(addRes.ok()).toBeTruthy();
    const cartAfterAdd = await addRes.json();
    expect(cartAfterAdd.cart.find((i: any) => i.id === productId)).toBeTruthy();

    // 3. Update Quantity
    const updateRes = await request.patch(`/api/cart/items/${productId}`, {
      data: { quantity: 3 }
    });
    expect(updateRes.ok()).toBeTruthy();
    const cartAfterUpdate = await updateRes.json();
    const updatedItem = cartAfterUpdate.cart.find((i: any) => i.id === productId);
    expect(updatedItem.quantity).toBe(3);

    // 4. Remove Item
    const deleteRes = await request.delete(`/api/cart/items/${productId}`);
    expect(deleteRes.ok()).toBeTruthy();
    const cartAfterDelete = await deleteRes.json();
    expect(cartAfterDelete.cart.find((i: any) => i.id === productId)).toBeFalsy();
  });

});
