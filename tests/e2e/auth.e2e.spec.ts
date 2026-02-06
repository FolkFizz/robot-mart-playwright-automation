import { test, expect } from '@fixtures';
import { users, authInputs, authErrors } from '@data';
import { randomUser, randomPasswordPair } from '@utils';



test.describe('auth @e2e @safe', () => {
    test.use({ seedData: true });

    test.describe('positive cases', () => {

        test('login success @smoke @e2e @safe', async({ loginPage }) => {
            await loginPage.goto();
            await loginPage.login(users.user.username, users.user.password);

            expect(await loginPage.isLoggedIn()).toBe(true);
        });

        test('logout success @e2e @safe', async({ page, loginPage }) => {
            await loginPage.goto();
            await loginPage.login(users.user.username, users.user.password);
            await loginPage.logout();
            // after logout, the user should see the login link again
            await expect(page.getByRole('link', {name: authInputs.loginLinkText})).toBeVisible();
        });

    });

    test.describe('negative cases', () => {

        test('login fail: wrong password @e2e @regression @safe', async({ page, loginPage }) => {
            await loginPage.goto();

            await loginPage.fillUsername(users.user.username);
            await loginPage.fillPassword(authInputs.wrongPassword);
            await loginPage.submit();

            await expect(page.locator('.error')).toBeVisible();
        });

        test('login fail: wrong username @e2e @regression @safe', async({ page, loginPage }) => {
            await loginPage.goto();

            await loginPage.fillUsername(authInputs.wrongUsername);
            await loginPage.fillPassword(users.user.password);
            await loginPage.submit();

            await expect(page.locator('.error')).toBeVisible();
        });
    });
});

test.describe('register @e2e @destructive (seeded)', () => {
    test.use({ seedData: true });

    test.describe('positive cases', () => {
        
        test('register success @e2e @regression @destructive', async({ page, registerPage, loginPage }) => {
            const user = randomUser('auto');

            await registerPage.goto();
            await registerPage.register(user.username, user.email, user.password);

            // after a successful registration, redirect to the login page
            await expect(page).toHaveURL(/\/login/);
            await expect(loginPage.getUsernameInput()).toBeVisible();
        });

    });

    test.describe('negative cases', () => {

        test('register fail: password mismatch @e2e @regression @destructive', async({ page, registerPage }) => {
            const user = randomUser('auto');
            const {password, confirmPassword} = randomPasswordPair(true);

            await registerPage.goto();
            await registerPage.fillUsername(user.username);
            await registerPage.fillEmail(user.email);
            await registerPage.fillPassword(password);
            await registerPage.fillConfirmPassword(confirmPassword);
            await registerPage.submit();

            await expect(page.locator('.error')).toBeVisible();
            await expect(page.locator('.error')).toContainText(authErrors.passwordMismatch);
        });

        test('register fail: duplicate username/email @e2e @regression @destructive', async({ page, registerPage }) => {
            await registerPage.goto();
            await registerPage.fillUsername(users.user.username);
            await registerPage.fillEmail(authInputs.duplicateEmail);
            await registerPage.fillPassword(authInputs.duplicatePassword);
            await registerPage.fillConfirmPassword(authInputs.duplicatePassword);
            await registerPage.submit();

            await expect(page.locator('.error')).toBeVisible();
            await expect(page.locator('.error')).toContainText(authErrors.duplicateUser);

        });
    });
});

