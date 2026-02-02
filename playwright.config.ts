import {defineConfig, devices} from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// โหลดค่า env จาก .env เพียงไฟล์เดียว (Single Source of Truth)
dotenv.config({path: path.resolve(__dirname, '.env')});

// ตั้งค่า Playwright หลักของโปรเจค
export default defineConfig({
    testDir: './tests',

    // รันคู่ขนานได้ยกเว้นตอน CI เพื่อความนิ่ง
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 1 : undefined,

    // Reporter: list + html + allure
    reporter: [
        ['list'],
        ['html'],
        ['allure-playwright', {outputFolder: 'allure-results'}]
    ],

    // ค่า default ที่ใช้ร่วมกันทุกเทส
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        testIdAttribute: 'data-testid',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 10_000,
        navigationTimeout: 30_000
    },

    // ตั้งโปรเจคเพื่อรันหลาย browser
    projects: [
        {name: 'chromium', use: {...devices['Desktop Chrome']}},
        {name: 'firefox', use: {...devices['Desktop Firefox']}},
        {name: 'webkit', use: {...devices['Desktop Safari']}}
    ]
});
