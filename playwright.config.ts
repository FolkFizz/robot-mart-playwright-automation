import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load env values from a single source-of-truth .env file.
dotenv.config({ path: path.resolve(__dirname, '.env') });

if (!process.env.PW_RUN_ID) {
  process.env.PW_RUN_ID = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Main Playwright configuration for this project.
export default defineConfig({
  testDir: './tests',

  // Keep CI execution stable by limiting worker behavior.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Reporter: list + html + allure
  reporter: [['list'], ['html'], ['allure-playwright', { outputFolder: 'allure-results' }]],

  // Shared defaults used by all tests.
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000
  },

  // Run the same suite across multiple browsers.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
});
