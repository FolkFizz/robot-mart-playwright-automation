import { test as base } from './base.fixture';
import { runA11y, expectNoA11yViolations } from '../../tests/non-functional/a11y/_support/axe-runner';

type A11yFixtures = {
  runA11y: typeof runA11y;
  expectNoA11yViolations: typeof expectNoA11yViolations;
};

// fixture สำหรับ a11y: เสริม helper ให้ test เรียกใช้ได้ง่าย
export const test = base.extend<A11yFixtures>({
  runA11y: async ({}, use) => {
    await use(runA11y);
  },
  expectNoA11yViolations: async ({}, use) => {
    await use(expectNoA11yViolations);
  }
});

export { expect } from './base.fixture';
