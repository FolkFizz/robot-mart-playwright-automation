import { test, expect } from '../fixtures/pom';

// Use pre-authenticated user session
test.use({ storageState: 'playwright/.auth/user.json' });

test('Customer successfully purchases a product', async ({ 
  page, 
  request,
  checkoutPage  // Use CheckoutPage from POM fixture
}) => {
  test.slow();

  // Step 0: Reset state via testability APIs
  const resetCart = await request.delete('/api/cart/reset');
  expect(resetCart.ok(), 'Expected cart reset to succeed').toBeTruthy();
  const resetProducts = await request.post('/api/products/reset-stock', {
    headers: { 'X-RESET-KEY': process.env.RESET_KEY || '' }
  });
  expect(resetProducts.ok(), 'Expected product reset to succeed').toBeTruthy();

  // Step 1: Navigate to Shop and search for product
  await page.goto('/');
  const productName = 'Rusty-Bot 101';
  await page.locator('input[name="q"][type="text"]').fill(productName);
  await page.locator('input[name="q"][type="text"]').press('Enter');

  // Step 2: Select and open product
  const productCard = page.locator('[data-testid^="product-card-"]')
    .filter({ has: page.getByText(productName) })
    .first();
  await productCard.locator('a').first().click();

  // Step 3: Verify product page and add to cart
  await expect(page.getByTestId('product-title')).toContainText(productName);
  await page.getByTestId('product-add-to-cart').click();
  await page.waitForLoadState('networkidle');

  // Step 4: Verify cart badge updated
  await page.reload();
  const cartBadge = page.getByTestId('nav-cart-count');
  await expect(cartBadge).toHaveText('1');

  // Step 5: Navigate to cart and verify item
  await page.goto('/cart');
  await expect(page.locator('[data-testid^="cart-item-name-"]').filter({ hasText: productName })).toBeVisible();

  // Step 6: Apply coupon
  await page.getByTestId('cart-coupon-input').fill('ROBOT99');
  await page.getByTestId('cart-apply-coupon').click();
  await expect(page.getByTestId('cart-discount')).toBeVisible({ timeout: 15000 });

  // Step 7: Proceed to checkout
  await page.getByTestId('cart-checkout').click();
  await expect(page.getByTestId('checkout-form')).toBeVisible({ timeout: 15000 });

  // Step 8: Fill checkout form using CheckoutPage POM
  await checkoutPage.fillPaymentDetails('Robot Store Sandbox QA User', 'user@robotmart.test');
  
  // Step 9: Submit order using CheckoutPage POM with built-in retry logic
  await checkoutPage.submitOrder();

  // Step 10: Verify order success
  await expect(page.getByTestId('order-success-message')).toHaveText(/payment successful/i);
});

