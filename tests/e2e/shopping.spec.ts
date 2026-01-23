import { test, expect } from '@playwright/test';
import { ShopPage } from '../../pages/ShopPage';
import { ProductDetailPage } from '../../pages/ProductDetailPage';
import { CartPage } from '../../pages/CartPage';

test.use({ storageState: 'playwright/.auth/user.json' });

test('Customer successfully purchases a product', async ({ page, request }) => {

  test.slow();

  // Step 1: Auth is handled via storageState for a regular user.
  const shopPage = new ShopPage(page);
  const productPage = new ProductDetailPage(page);
  const cartPage = new CartPage(page);

  // Step 0: Reset state via testability APIs.
  const resetCart = await request.delete('/api/cart/reset');
  expect(resetCart.ok(), 'Expected cart reset to succeed').toBeTruthy();
  const resetProducts = await request.post('/api/products/reset');
  expect(resetProducts.ok(), 'Expected product reset to succeed').toBeTruthy();

  // Step 2: Navigate to the Shop page.
  await shopPage.navigate();

  // Step 3: Search and open a specific product (stock guaranteed by reset).
  const productName = 'Rusty-Bot 101';
  await shopPage.searchProduct(productName);
  await shopPage.openProductByName(productName);

  // Step 4: Verify product detail page title.
  await expect(productPage.title).toContainText(productName);

  // Step 5: Add the product to the cart.
  await productPage.addToCart();

  // Step 6: Verify a success indicator (cart badge after reload).
  await page.reload();
  const cartBadge = page.getByTestId('nav-cart-count');
  await expect(cartBadge).toHaveText('1');

  // Step 7: Go to the cart and apply coupon.
  await cartPage.navigate();
  await cartPage.expectItemInCart(productName);
  await cartPage.applyCoupon('ROBOT99');

  // Step 8: Proceed to checkout.
  await cartPage.proceedToCheckout();
  await expect(page.getByTestId('checkout-form')).toBeVisible({ timeout: 15000 });

  // Step 9: Fill Stripe Payment Element (test mode) using snapshot-proven locators.
  await page.getByTestId('checkout-name').fill('Robot Mart QA User');
  await page.getByTestId('checkout-email').fill('user@robotmart.test');

  await expect(page.getByTestId('payment-element')).toBeVisible({ timeout: 15000 });

  const stripeFrame = page.frameLocator('iframe[src*="stripe"]').first();

  const cardInput = stripeFrame.getByPlaceholder('1234 1234 1234 1234');
  await expect(cardInput).toBeVisible({ timeout: 20000 });
  await cardInput.fill('4242424242424242');

  const expInput = stripeFrame.getByPlaceholder('MM / YY');
  await expect(expInput).toBeVisible({ timeout: 20000 });
  await expInput.fill('12 / 30');

  const cvcInput = stripeFrame.getByPlaceholder('CVC');
  await expect(cvcInput).toBeVisible({ timeout: 20000 });
  await cvcInput.fill('123');
  await cvcInput.press('Tab');
  await page.waitForTimeout(1000);

  // Step 10: Submit payment and verify order success page.
  await page.getByTestId('checkout-submit').click();
  await expect(page).toHaveURL(/\/order\/success/, { timeout: 30000 });
  await expect(page.getByTestId('order-success-message')).toHaveText(/payment successful/i);
});
