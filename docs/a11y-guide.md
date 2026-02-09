# A11y Guide (axe)

This guide explains how to run accessibility tests using `axe`.

## Prerequisites
- `@axe-core/playwright` installed
- Helper modules:
  - `src/fixtures/base.fixture.ts`
  - `src/utils/a11y.ts`

## Run commands
```bash
npm run test:a11y
# or
npx playwright test tests/a11y --grep "@a11y"
```

## Example
```ts
import { test } from '@fixtures/base.fixture';

test('home a11y @a11y @safe', async ({ page, runA11y, expectNoA11yViolations }) => {
  await page.goto('/');
  const results = await runA11y(page);
  expectNoA11yViolations(results);
});
```

## Customize rules/exclusions
Edit `src/utils/a11y.ts`:
- `a11yExcludeSelectors`: ignore known UI blocks
- `a11yRules`: enable/disable rules
- `allowedViolationIds`: temporary accepted issues
