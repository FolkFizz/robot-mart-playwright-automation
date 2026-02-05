import { test } from '@fixtures/base.fixture';

import { HomePage } from '@pages/home.page';

test.describe('home a11y @a11y @safe', () => {
  test('home page has no critical violations @a11y @smoke @safe', async ({ page, runA11y, expectNoA11yViolations }) => {
    const home = new HomePage(page);
    await home.goto();

    const results = await runA11y(page);
    expectNoA11yViolations(results);
  });
});
