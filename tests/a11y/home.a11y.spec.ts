import { test } from '@fixtures';

test.describe('home a11y @a11y @safe', () => {
  test('home page has no critical violations @a11y @smoke @safe', async ({ page, homePage, runA11y, expectNoA11yViolations }) => {
    await homePage.goto();

    const results = await runA11y(page);
    expectNoA11yViolations(results);
  });
});
