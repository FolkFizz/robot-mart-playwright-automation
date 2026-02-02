import { expect, Locator, Page } from '@playwright/test';

// UI asserts สำหรับ locator/page
export const expectText = async (locator: Locator, text: string | RegExp) => {
  await expect(locator).toContainText(text);
};

export const expectExactText = async (locator: Locator, text: string | RegExp) => {
  await expect(locator).toHaveText(text);
};

export const expectValue = async (locator: Locator, value: string | RegExp) => {
  await expect(locator).toHaveValue(value);
};

export const expectEnabled = async (locator: Locator) => {
  await expect(locator).toBeEnabled();
};

export const expectDisabled = async (locator: Locator) => {
  await expect(locator).toBeDisabled();
};

export const expectUrl = async (page: Page, url: string | RegExp) => {
  await expect(page).toHaveURL(url);
};
