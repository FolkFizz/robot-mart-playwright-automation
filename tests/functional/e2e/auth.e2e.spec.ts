import {test as base, expect} from '@playwright/test';
import {test as dataTest} from '@fixtures/data.fixture'

import { LoginPage} from "@pages/auth/login.page";
import { RegisterPage } from "@pages/auth/register.page";
import { NavbarComponent } from "@components/navbar.component";

import { users } from "tests/_support/test-data/users";
import { randomUser, randomPasswordPair } from '@utils/random';
import { testIdAuth } from '@selectors/testids';



base.describe('auth @e2e', () => {

    base.describe('positive cases', () => {

        base('login success @smoke @e2e', async({page}) => {
            const login = new LoginPage(page);
            const navbar = new NavbarComponent(page);

            await login.goto();
            await login.login(users.user.username, users.user.password);

            expect(await navbar.isLoggedIn()).toBe(true);
        });

        base('logout success @e2e', async({page}) => {
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

        base('login fail: wrong password @e2e @regression', async({page}) => {
            const login = new LoginPage(page);
            await login.goto();

            await page.getByTestId(testIdAuth.loginUsername).fill(users.user.username);
            await page.getByTestId(testIdAuth.loginPassword).fill('wrong_password');
            await page.getByTestId(testIdAuth.loginSubmit).click();

            await expect(page.locator('.error')).toBeVisible();
        });

        base('login fail: wrong username @e2e @regression', async({page}) => {
            const login = new LoginPage(page);
            await login.goto();

            await page.getByTestId(testIdAuth.loginUsername).fill('wrong_username');
            await page.getByTestId(testIdAuth.loginPassword).fill(users.user.password);
            await page.getByTestId(testIdAuth.loginSubmit).click();

            await expect(page.locator('.error')).toBeVisible();
        });
    });
});

dataTest.describe('register @e2e (seeded)', () => {

    dataTest.describe('positive cases', () => {
        
        dataTest('register success @e2e @regression', async({page}) => {
            const register = new RegisterPage(page);
            const user = randomUser('auto');

            await register.goto();
            await register.register(user.username, user.email, user.password);

            // after a successful registration, redirect to the login page
            await expect(page).toHaveURL(/\/login/);
            await expect(page.getByTestId(testIdAuth.loginUsername)).toBeVisible();
        });

    });

    dataTest.describe('negative cases', () => {

        dataTest('register fail: password mismatch @e2e @regression', async({page}) => {
            const register = new RegisterPage(page);
            const user = randomUser('auto');
            const {password, confirmPassword} = randomPasswordPair(true);

            await register.goto();
            await page.getByTestId(testIdAuth.registerUsername).fill(user.username);
            await page.getByTestId(testIdAuth.registerEmail).fill(user.email);
            await page.getByTestId(testIdAuth.registerPassword).fill(password);
            await page.getByTestId(testIdAuth.registerConfirm).fill(confirmPassword);
            await page.getByTestId(testIdAuth.registerSubmit).click();

            await expect(page.locator('.error')).toBeVisible();
            await expect(page.locator('.error')).toContainText('Passwords do not match');
        });

        dataTest('register fail: duplicate username/email @e2e @regression', async({page}) => {
            const register = new RegisterPage(page);

            await register.goto();
            await page.getByTestId(testIdAuth.registerUsername).fill(users.user.username);
            await page.getByTestId(testIdAuth.registerEmail).fill('user@robotstore.com');
            await page.getByTestId(testIdAuth.registerPassword).fill('user123');
            await page.getByTestId(testIdAuth.registerConfirm).fill('user123');
            await page.getByTestId(testIdAuth.registerSubmit).click();

            await expect(page.locator('.error')).toBeVisible();
            await expect(page.locator('.error')).toContainText('Username or Email already exists');

        });
    });
});

