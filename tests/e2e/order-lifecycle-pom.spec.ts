import { test, expect } from '../fixtures/pom';
import { generateUser } from '../helpers/user-helper';

test('E2E: Order Lifecycle (POM)', async ({ page, loginPage, productPage, checkoutPage, adminPage, browser }) => {
  // 1. Setup Data (Reset Stock)
  await page.request.post('/api/products/reset-stock', {
    headers: { 'X-RESET-KEY': 'resetstock2026' }
  });

  // 2. Register & Login
  const user = generateUser();
  await loginPage.navigate();
  // Register flow isn't in POM yet, keeping inline or adding to LoginPage?
  // Ideally add register to LoginPage or AuthPage. For now, inline register to keep it simple or expand LoginPage.
  // Let's expand LoginPage to include register for cleaner code.
  await page.goto('/register');
  await page.getByTestId('register-username').fill(user.username);
  await page.getByTestId('register-email').fill(user.email);
  await page.getByTestId('register-password').fill(user.password);
  await page.getByTestId('register-confirm-password').fill(user.password);
  await page.getByTestId('register-submit').click();
  await expect(page).toHaveURL(/\/login/);

  await loginPage.login(user.username, user.password);
  await loginPage.verifyLoggedIn();

  // 3. Shop & Add to Cart
  await productPage.goto('/');
  await productPage.searchProduct('Rusty-Bot 101');
  await productPage.selectProduct('Rusty-Bot 101');
  await productPage.addToCart();
  await productPage.goToCart();

  // 4. Checkout
  await page.getByTestId('cart-checkout').click();
  await checkoutPage.fillPaymentDetails(user.username, user.email);
  await checkoutPage.submitOrder();

  // 5. Verify & Admin Check
  const orderId = (await page.getByTestId('order-id').textContent())?.trim();
  expect(orderId).toBeTruthy();

  // Create new context for Admin to avoid session conflict
  const adminContext = await browser.newContext({ storageState: 'playwright/.auth/admin.json' });
  const adminPageObj = new (await import('../../pages/AdminPage')).AdminPage(await adminContext.newPage());
  
  if (orderId) {
     await adminPageObj.verifyOrder(orderId);
  }

  await adminContext.close();
});
