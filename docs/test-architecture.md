# Test Architecture (Quick Read)

This page explains how the test code is structured, so reviewers can map behavior quickly.

## Design goals

- Keep `*.spec.ts` focused on intent and assertions
- Move selectors/interactions to Page Objects (POM)
- Centralize shared setup/login/seed in fixtures and test-support helpers
- Keep k6 scenarios consistent via shared libs (config, checks, scenarios, thresholds)

## Layers

1. Test specs (`tests/**`)

- Own test case flow and business expectations
- Should avoid direct `page.locator(...)` when a page object method exists

2. Page objects (`src/pages/**`)

- Encapsulate selectors and UI interactions
- Expose clear methods such as `addToCart()`, `expectEmptyMessageVisible(...)`

3. Fixtures (`src/fixtures/**`)

- Provide typed reusable context (`api`, login helpers, page objects, a11y helpers)
- Handle shared test lifecycle concerns (seed lock, context setup)

4. Test support helpers (`src/test-support/**`)

- Cross-spec utilities (isolated users, session sync, inventory helpers)
- Keep helper logic out of specs and avoid long relative imports

5. API clients (`src/api/**`)

- Wrap common API calls and route usage
- Keep request details and headers centralized

6. Config/data (`src/config/**`, `src/data/**`)

- Centralize routes, env access, constants, and stable test data

7. Performance architecture (`performance/**`)

- `lib/`: shared auth/http/config/check helpers
- `scenarios/`: reusable load patterns
- `thresholds/`: threshold presets
- `scripts/`: scenario entry points only

## CI gates

- `npm run ci:quality`: formatting + typecheck + lint
- `npm run ci:quick`: quality gate + quick regression subset

## Evidence strategy

- Playwright artifacts: `playwright-report`, `test-results`, `allure-results`, `allure-report`
- k6 artifacts: `performance/results/<run-id>/manifest.{json,md}` + logs + summaries
