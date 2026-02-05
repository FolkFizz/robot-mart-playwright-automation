import { test, expect } from '@fixtures/base.fixture';

import { LoginPage } from '@pages/auth/login.page';
import { RegisterPage } from '@pages/auth/register.page';

import { users } from '@data/users';
import { authInputs, authErrors } from '@data/auth';
import { randomUser, randomPasswordPair } from '@utils/random';



test.describe('auth @e2e @safe', () => {
    test.use({ seedData: true });

    test.describe('positive cases', () => {

        test('login success @smoke @e2e @safe', async({page}) => {
            const login = new LoginPage(page);

            await login.goto();
            await login.login(users.user.username, users.user.password);

            expect(await login.isLoggedIn()).toBe(true);
        });

        test('logout success @e2e @safe', async({page}) => {
            const login = new LoginPage(page);

            await login.goto();
            await login.login(users.user.username, users.user.password);
            await login.logout();
            // after logout, the user should see the login link again
            await expect(page.getByRole('link', {name: authInputs.loginLinkText})).toBeVisible();
        });

    });

    test.describe('negative cases', () => {

        test('login fail: wrong password @e2e @regression @safe', async({page}) => {
            const login = new LoginPage(page);
            await login.goto();

            await login.fillUsername(users.user.username);
            await login.fillPassword(authInputs.wrongPassword);
            await login.submit();

            await expect(page.locator('.error')).toBeVisible();
        });

        test('login fail: wrong username @e2e @regression @safe', async({page}) => {
            const login = new LoginPage(page);
            await login.goto();

            await login.fillUsername(authInputs.wrongUsername);
            await login.fillPassword(users.user.password);
            await login.submit();

            await expect(page.locator('.error')).toBeVisible();
        });
    });
});

test.describe('register @e2e @destructive (seeded)', () => {
    test.use({ seedData: true });

    test.describe('positive cases', () => {
        
        test('register success @e2e @regression @destructive', async({page}) => {
            const register = new RegisterPage(page);
            const login = new LoginPage(page);
            const user = randomUser('auto');

            await register.goto();
            await register.register(user.username, user.email, user.password);

            // after a successful registration, redirect to the login page
            await expect(page).toHaveURL(/\/login/);
            await expect(login.getUsernameInput()).toBeVisible();
        });

    });

    test.describe('negative cases', () => {

        test('register fail: password mismatch @e2e @regression @destructive', async({page}) => {
            const register = new RegisterPage(page);
            const user = randomUser('auto');
            const {password, confirmPassword} = randomPasswordPair(true);

            await register.goto();
            await register.fillUsername(user.username);
            await register.fillEmail(user.email);
            await register.fillPassword(password);
            await register.fillConfirmPassword(confirmPassword);
            await register.submit();

            await expect(page.locator('.error')).toBeVisible();
            await expect(page.locator('.error')).toContainText(authErrors.passwordMismatch);
        });

        test('register fail: duplicate username/email @e2e @regression @destructive', async({page}) => {
            const register = new RegisterPage(page);

            await register.goto();
            await register.fillUsername(users.user.username);
            await register.fillEmail(authInputs.duplicateEmail);
            await register.fillPassword(authInputs.duplicatePassword);
            await register.fillConfirmPassword(authInputs.duplicatePassword);
            await register.submit();

            await expect(page.locator('.error')).toBeVisible();
            await expect(page.locator('.error')).toContainText(authErrors.duplicateUser);

        });
    });
});

