import { test, expect, type Page } from '@playwright/test';

type NewUser = {
  username: string;
  email: string;
  password: string;
};

const buildUser = (): NewUser => {
  const stamp = Date.now();
  const rand = Math.floor(Math.random() * 10000);
  return {
    username: `user_${stamp}_${rand}`,
    email: `test_${stamp}_${rand}@robotmart.local`,
    password: `Robot#${rand}123`,
  };
};

const registerUser = async (page: Page, user: NewUser): Promise<void> => {
  await page.goto('/register', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('register-username').fill(user.username);
  await page.getByTestId('register-email').fill(user.email);
  await page.getByTestId('register-password').fill(user.password);
  await page.getByTestId('register-confirm-password').fill(user.password);

  await Promise.all([
    page.waitForURL(/\/(login)?(\?|$)/, { waitUntil: 'domcontentloaded', timeout: 20000 }),
    page.getByTestId('register-submit').click(),
  ]);
};

const loginUser = async (page: Page, user: NewUser): Promise<void> => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.getByTestId('login-username').fill(user.username);
  await page.getByTestId('login-password').fill(user.password);

  await Promise.all([
    page.waitForURL(/\/(\?|$)/, { waitUntil: 'domcontentloaded', timeout: 20000 }),
    page.getByTestId('login-submit').click(),
  ]);
};

const ensureLoggedIn = async (page: Page, user: NewUser): Promise<void> => {
  const url = page.url();
  if (url.includes('/login')) {
    await loginUser(page, user);
  }
};

const extractOrderId = async (page: Page): Promise<string> => {
  const orderIdLocator = page.getByTestId('order-id');
  if (await orderIdLocator.count()) {
    const raw = (await orderIdLocator.textContent())?.trim();
    if (raw) return raw;
  }

  const content = await page.textContent('body');
  const match = content?.match(/ORD-[A-Za-z0-9-]+/);
  if (!match) {
    throw new Error('Order ID not found on success page.');
  }
  return match[0];
};

const openNotifications = async (page: Page): Promise<void> => {
  const bell = page.getByTestId('nav-bell');
  if (await bell.count()) {
    await bell.click();
    return;
  }

  const fallback = page.locator('#notifMenuContainer .dropdown-trigger');
  await fallback.click();
};

const prepareShoppingState = async (page: Page, user: NewUser): Promise<void> => {
  await registerUser(page, user);
  await ensureLoggedIn(page, user);

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // FIX: Re-enable search because product is not on homepage.
  // We rely on UI element appearance instead of URL changes to avoid Firefox flakes.
  await page.locator('.header-area .search-box input[name="q"]').fill('Rusty-Bot 101');
  await page.keyboard.press('Enter');

  const productCard = page
    .locator('[data-testid^="product-card-"]')
    .filter({ has: page.getByText('Rusty-Bot 101') })
    .first();
  await expect(productCard).toBeVisible({ timeout: 20000 });
  await productCard.locator('a').first().click();
  await expect(page).toHaveURL(/\/product\//, { timeout: 15000 });
  await expect(page.getByTestId('product-title')).toContainText('Rusty-Bot 101');

  await expect(page.getByTestId('product-add-to-cart')).toBeVisible({ timeout: 15000 });
  await page.getByTestId('product-add-to-cart').click();
  await page.waitForTimeout(2000);

  await page.waitForLoadState('networkidle');
  await page.goto('/cart', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/cart/);
};

const performCheckout = async (page: Page, user: NewUser): Promise<void> => {
  const checkoutBtn = page.getByTestId('cart-checkout');
  await checkoutBtn.click();
  try {
    await page.waitForURL(/\/order\/checkout/, { timeout: 2000 });
  } catch (e) {
    if (await checkoutBtn.isVisible()) {
      console.log('Retrying cart checkout navigation...');
      await checkoutBtn.click();
    }
  }

  await expect(page.getByTestId('checkout-form')).toBeVisible({ timeout: 15000 });
  await page.getByTestId('checkout-name').fill(user.username);
  await page.getByTestId('checkout-email').fill(user.email);

  const paymentElement = page.getByTestId('payment-element');
  await expect(paymentElement).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#payment-element')).toHaveAttribute('data-stripe-ready', 'true', { timeout: 20000 });
  const iframeElement = page.frameLocator('iframe[src*="stripe"]').first();

  const cardInput = iframeElement.getByPlaceholder('1234 1234 1234 1234');
  await expect(cardInput).toBeVisible({ timeout: 20000 });
  await cardInput.click();
  await cardInput.pressSequentially('4242424242424242', { delay: 200 });

  const expInput = iframeElement.getByPlaceholder('MM / YY');
  await expect(expInput).toBeVisible({ timeout: 20000 });
  await expInput.pressSequentially('12 / 30', { delay: 200 });

  const cvcInput = iframeElement.getByPlaceholder('CVC');
  await expect(cvcInput).toBeVisible({ timeout: 20000 });
  await cvcInput.pressSequentially('123', { delay: 200 });
  await cvcInput.press('Tab');
  console.log('Filling complete. Forcing blur (body click) and waiting for Stripe tokenization...');
  await page.locator('body').click({ position: { x: 0, y: 0 } });
  await page.waitForTimeout(5000);

  const submitButton = page.getByTestId('checkout-submit');
  await expect(submitButton).not.toBeDisabled();

  console.log('Attempting primary submission (Focus + Click)...');
  await submitButton.focus();
  await submitButton.click();

  try {
    await page.waitForURL(/\/order\/success/, { timeout: 4000 });
  } catch (e) {
    console.log('Primary click did not redirect. Attempting Fallback: Keyboard ENTER...');
    if (await submitButton.isVisible()) {
      await submitButton.focus();
      await page.keyboard.press('Enter');
    }
  }

  await expect(page).toHaveURL(/\/order\/success/, { timeout: 30000 });
  await expect(page.getByTestId('order-success-message')).toBeVisible({ timeout: 15000 });
};

const verifyOrderCompletion = async (userPage: Page, adminPage: Page, orderId: string): Promise<void> => {
  const invoiceLink = userPage.getByRole('link', { name: /view invoice/i });
  await invoiceLink.click();
  await expect(userPage).toHaveURL(/\/order\/invoice\//, { timeout: 15000 });
  await expect(userPage.getByText(orderId)).toBeVisible({ timeout: 15000 });
  const backToHome = userPage.getByTestId('btn-back-to-home');
  if (await backToHome.isVisible().catch(() => false)) {
    await backToHome.click();
    await expect(userPage).toHaveURL(/\/(\?|$)/, { timeout: 15000 });
  } else {
    await userPage.goBack({ waitUntil: 'domcontentloaded' });
  }

  await userPage.waitForTimeout(4000);
  await userPage.reload({ waitUntil: 'domcontentloaded' });
  await openNotifications(userPage);
  const notifItem = userPage.getByText(orderId);
  await expect(notifItem).toBeVisible({ timeout: 20000 });
  await notifItem.click();

  await adminPage.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
  const orderRow = adminPage.getByTestId(`order-row-${orderId}`);
  await expect(orderRow).toBeVisible({ timeout: 20000 });
  await expect(orderRow).toContainText(/paid/i);
};

test('Order lifecycle: user purchase -> notification -> admin verification', async ({ browser }) => {
  test.slow();

  const baseURL = test.info().project.use?.baseURL as string | undefined;
  const resolvedBaseURL = baseURL || 'http://localhost:3000';

  const adminContext = await browser.newContext({
    baseURL: resolvedBaseURL,
    storageState: 'playwright/.auth/admin.json',
  });
  const userContext = await browser.newContext({ baseURL: resolvedBaseURL });

  const adminPage = await adminContext.newPage();
  const userPage = await userContext.newPage();
  userPage.on('console', msg => console.log(`[Browser Console]: ${msg.text()}`));

  try {
    const adminRequest = adminContext.request;
    const resetCart = await adminRequest.delete('/api/cart/reset');
    expect(resetCart.ok(), 'Expected cart reset to succeed').toBeTruthy();
    const resetProducts = await adminRequest.post('/api/products/reset');
    expect(resetProducts.ok(), 'Expected product reset to succeed').toBeTruthy();

    const user = buildUser();
    await prepareShoppingState(userPage, user);
    await performCheckout(userPage, user);
    const orderId = await extractOrderId(userPage);
    await verifyOrderCompletion(userPage, adminPage, orderId);
  } finally {
    await Promise.all([adminContext.close(), userContext.close()]);
  }
});
