# Test Taxonomy

## Functional

- `tests/api`: API tests using request context
- `tests/integration`: flows spanning API + UI
- `tests/e2e`: full user journeys

## Non-functional

- `tests/a11y`: accessibility
- `tests/security`: basic security checks
- `tests/perf`: performance/load (if any)

## Tagging strategy

- Use `@safe` for read-only tests.
- Use `@destructive` for tests that modify data.
- Add `@smoke` for fast checks, `@regression` for full suites.

## Seeded tests

- Seeded suites are **destructive** by nature and should be tagged `@destructive`.
- Local seed uses `init.sql` from the web repo; prod runs skip reset/seed.

## Goal

Clear separation by type + tags makes it easy to run the right subset locally, in CI, or against production safely.

## See also

- [Quick Guide](./quick-guide.md)
- [Tagging Convention](./tagging-convention.md)
