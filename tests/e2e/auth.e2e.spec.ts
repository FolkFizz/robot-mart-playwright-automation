import {test as base, expect} from '@playwright/test';
import {test as dataTest} from '@fixtures/data.fixture';

import { LoginPage } from '@pages/auth/login.page';
import { RegisterPage } from '@pages/auth/register.page';
import { NavbarComponent } from '@components/navbar.component';

import { users } from '@data/users';
import { randomUser, randomPasswordPair } from '@utils/random';



base.describe('auth @e2e @safe', () => {

    base.describe('positive cases', () => {

        base('login success @smoke @e2e @safe', async({page}) => {
            const login = new LoginPage(page);
            const navbar = new NavbarComponent(page);

            await login.goto();
            await login.login(users.user.username, users.user.password);

            expect(await navbar.isLoggedIn()).toBe(true);
        });

        base('logout success @e2e @safe', async({page}) => {
            const login = new LoginPage(page);
            const navbar = new NavbarComponent(page);

            await login.goto();
            await login.login(users.user.username, users.user.password);
            await navbar.logout();
            // after logout, the user should see the login link again
            await expect(page.getByRole('link', {name: 'Log in'})).toBeVisible();
        });

    });

    base.describe('negative cases', () => {

        base('login fail: wrong password @e2e @regression @safe', async({page}) => {
            const login = new LoginPage(page);
            await login.goto();

            await login.fillUsername(users.user.username);
            await login.fillPassword('wrong_password');
            await login.submit();

            await expect(page.locator('.error')).toBeVisible();
        });

        base('login fail: wrong username @e2e @regression @safe', async({page}) => {
            const login = new LoginPage(page);
            await login.goto();

            await login.fillUsername('wrong_username');
            await login.fillPassword(users.user.password);
            await login.submit();

            await expect(page.locator('.error')).toBeVisible();
        });
    });
});

dataTest.describe('register @e2e @destructive (seeded)', () => {

    dataTest.describe('positive cases', () => {
        
        dataTest('register success @e2e @regression @destructive', async({page}) => {
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

    dataTest.describe('negative cases', () => {

        dataTest('register fail: password mismatch @e2e @regression @destructive', async({page}) => {
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
            await expect(page.locator('.error')).toContainText('Passwords do not match');
        });

        dataTest('register fail: duplicate username/email @e2e @regression @destructive', async({page}) => {
            const register = new RegisterPage(page);

            await register.goto();
            await register.fillUsername(users.user.username);
            await register.fillEmail('user@robotstore.com');
            await register.fillPassword('user123');
            await register.fillConfirmPassword('user123');
            await register.submit();

            await expect(page.locator('.error')).toBeVisible();
            await expect(page.locator('.error')).toContainText('Username or Email already exists');

        });
    });
});

