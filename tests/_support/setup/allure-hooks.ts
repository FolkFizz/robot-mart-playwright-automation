import type { TestType } from '@playwright/test';
import { attachJson, attachScreenshot, attachText } from '@utils/allure';

// helper สำหรับผูก Allure hooks กับ test
export const registerAllureHooks = (test: TestType<any, any>) => {
  test.beforeEach(async ({}, testInfo) => {
    await attachText('test.title', testInfo.title);
    await attachJson('test.annotations', testInfo.annotations ?? []);
  });

  test.afterEach(async ({ page }, testInfo) => {
    const failed = testInfo.status !== testInfo.expectedStatus;
    if (!failed) return;

    if (page) {
      const shot = await page.screenshot({ fullPage: true }).catch(() => null);
      if (shot) {
        await attachScreenshot('failure.screenshot', shot);
      }
    }

    if (testInfo.error) {
      await attachText('error.message', testInfo.error.message);
    }
  });
};
