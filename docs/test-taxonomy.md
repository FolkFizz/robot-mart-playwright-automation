# Test Taxonomy

## Functional
- `tests/functional/api`: API tests using request context
- `tests/functional/integration`: flows spanning API + UI
- `tests/functional/e2e`: full user journeys

## Non-functional
- `tests/non-functional/a11y`: accessibility
- `tests/non-functional/security`: basic security checks
- `tests/non-functional/perf`: performance/load (if any)

## Tagging strategy
- Use `@safe` for read-only tests.
- Use `@destructive` for tests that modify data.
- Add `@smoke` for fast checks, `@regression` for full suites.

## Goal
Clear separation by type + tags makes it easy to run the right subset locally, in CI, or against production safely.
