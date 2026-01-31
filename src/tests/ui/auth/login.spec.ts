import { test, expect } from '../../../fixtures/test-data';

test.describe('@ui @auth @smoke Authentication - Login', () => {
  
  test('should allow user to login with valid credentials', async ({ loginPage }) => {
    await loginPage.goto();
    
    
    // Use valid test credentials
    await loginPage.login('testuser', 'password123');
    
    // Verify successful login by checking URL redirect
    await expect(loginPage.page).toHaveURL(/\/(profile|$)/);
  });

  test('should show error message for invalid credentials', async ({ loginPage }) => {
    await loginPage.goto();
    
    // Use invalid credentials
    await loginPage.login('invaliduser', 'wrongpassword');
    
    // Verify error message is displayed
    await expect(loginPage.errorMessage).toBeVisible();
    const errorText = await loginPage.getErrorText();
    expect(errorText.toLowerCase()).toContain('invalid');
  });

  test('should show error message for empty credentials', async ({ loginPage }) => {
    await loginPage.goto();
    
    // Try to submit with empty fields
    await loginPage.login('', '');
    
    // HTML5 validation should prevent submission
    // Verify we're still on login page
    await expect(loginPage.page).toHaveURL(/\/login/);
  });

  test('should navigate to forgot password page', async ({ loginPage }) => {
    await loginPage.goto();
    
    await loginPage.clickForgotPassword();
    
    // Verify navigation to forgot password page
    await expect(loginPage.page).toHaveURL(/\/forgot-password/);
  });

  test('should navigate to register page', async ({ loginPage }) => {
    await loginPage.goto();
    
    await loginPage.clickRegisterLink();
    
    // Verify navigation to register page
    await expect(loginPage.page).toHaveURL(/\/register/);
  });
});
