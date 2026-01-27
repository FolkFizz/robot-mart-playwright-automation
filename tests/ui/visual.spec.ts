// tests/ui/visual.spec.ts
import { test, expect } from '../fixtures/pom';

test('Homepage Visual Elements', async ({ page, productPage }) => {
  await productPage.goto('/');
  await expect(page).toHaveTitle(/Robot Store/i);
  
  // Verify Navbar elements
  await expect(page.getByTestId('nav-cart-link')).toBeVisible();
  
  // Verify Product Grid
  await expect(page.locator('.product-card').first()).toBeVisible();
  
  // Verify Footer
  await expect(page.locator('footer')).toContainText('Robot Store Sandbox');
});
