import { expect, Locator, Page } from '@playwright/test';

// assert พื้นฐานที่ใช้ร่วมกันหลายไฟล์
export const expectNonEmpty = (value: string, label = 'value') => {
  expect(value, `${label} should not be empty`).toBeTruthy();
};

export const expectInRange = (value: number, min: number, max: number, label = 'value') => {
  expect(value, `${label} should be >= ${min}`).toBeGreaterThanOrEqual(min);
  expect(value, `${label} should be <= ${max}`).toBeLessThanOrEqual(max);
};

export const expectUrlContains = async (page: Page, part: string | RegExp) => {
  await expect(page).toHaveURL(part);
};

export const expectVisible = async (locator: Locator) => {
  await expect(locator).toBeVisible();
};

export const expectHidden = async (locator: Locator) => {
  await expect(locator).toBeHidden();
};
