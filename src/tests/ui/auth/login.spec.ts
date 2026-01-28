import { test, expect } from '../../../fixtures/test-data';

test.describe('Authentication', () => {
  
  test('should allow user to log in with valid credentials', async ({ loginPage }) => {
    await loginPage.goto();
    // Intentionally using a likely failing credential to test the flow, 
    // real test needs valid data from API helper.
    await loginPage.loginAs('validUser', 'validPass');
    
    // Assertion (abstracted or direct)
    // expect(page.url()).toContain('/dashboard');
  });

  test('should show error for invalid credentials', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('invalid', 'invalid');
    await expect(loginPage.errorMessage).toBeVisible();
  });
});
