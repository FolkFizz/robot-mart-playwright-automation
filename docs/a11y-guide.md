# A11y Guide (axe)

This guide explains how to run accessibility tests using `axe`.

## Prerequisites
- `@axe-core/playwright` installed
- Helper modules:
  - `src/fixtures/a11y.fixture.ts`
  - `tests/non-functional/a11y/_support/axe-runner.ts`
  - `tests/non-functional/a11y/_support/axe-rules.ts`

## Run commands
```bash
npm run test:a11y
# or
npx playwright test tests/non-functional/a11y --grep "@a11y"
```

## Example
```ts
import { test } from '@fixtures/a11y.fixture';

test('home a11y @a11y @safe', async ({ page, runA11y, expectNoA11yViolations }) => {
  await page.goto('/');
  const results = await runA11y(page);
  expectNoA11yViolations(results);
});
```

## Customize rules/exclusions
Edit `tests/non-functional/a11y/_support/axe-rules.ts`:
- `a11yExcludeSelectors`: ignore known UI blocks
- `a11yRules`: enable/disable rules
- `allowedViolationIds`: temporary accepted issues
