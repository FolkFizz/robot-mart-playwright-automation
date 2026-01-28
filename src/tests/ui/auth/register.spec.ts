import { test, expect } from '../../../fixtures/test-data';
import { generateRandomUser } from '../../../fixtures/users';

test.describe('@smoke Authentication - Register', () => {
  
  test('should allow user to register with valid details', async ({ registerPage }) => {
    await registerPage.goto();
    
    const newUser = generateRandomUser();
    
    await registerPage.register(
      newUser.username,
      newUser.email,
      newUser.password,
      newUser.password
    );
    
    // Verify successful registration (usually redirects to login or home)
    await expect(registerPage.page).toHaveURL(/\/(login|profile|$)/);
  });

  test('should show error for mismatched passwords', async ({ registerPage }) => {
    await registerPage.goto();
    
    const newUser = generateRandomUser();
    
    await registerPage.register(
      newUser.username,
      newUser.email,
      'password123',
      'differentpassword'
    );
    
    // Verify error message
    await expect(registerPage.errorMessage).toBeVisible();
  });

  test('should show error for existing username', async ({ registerPage }) => {
    await registerPage.goto();
    
    // Try to register with existing username
    await registerPage.register(
      'testuser',
      'newemail@test.com',
      'password123',
      'password123'
    );
    
    // Verify error message about existing user
    await expect(registerPage.errorMessage).toBeVisible();
  });

  test('should navigate to login page', async ({ registerPage }) => {
    await registerPage.goto();
    
    await registerPage.clickLoginLink();
    
    // Verify navigation to login page
    await expect(registerPage.page).toHaveURL(/\/login/);
  });
});
