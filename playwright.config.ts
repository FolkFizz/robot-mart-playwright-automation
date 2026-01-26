import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 2,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['list'], ['html', { title: 'Robot Store Sandbox' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: 'https://robot-store-sandbox.onrender.com',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-testid',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: /tests\/setup\/auth\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'chrome',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
    },

    {
      name: 'firefox',
      dependencies: ['setup'],
      use: { ...devices['Desktop Firefox'], storageState: 'playwright/.auth/user.json' },
    },
    {
      name: 'safari',
      dependencies: ['setup'],
      use: { ...devices['Desktop Safari'], storageState: 'playwright/.auth/user.json' },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   dependencies: ['setup'],
    //   use: { ...devices['Pixel 5'], storageState: 'playwright/.auth/user.json' },
    // },
    // {
    //   name: 'Mobile Safari',
    //   dependencies: ['setup'],
    //   use: { ...devices['iPhone 12'], storageState: 'playwright/.auth/user.json' },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'https://robot-store-sandbox.onrender.com',
  //   reuseExistingServer: !process.env.CI,
  // },
});

