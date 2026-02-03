# Tagging Convention

Tags are used in test titles to control what runs in CI and in production.

## Core tags
- `@smoke`: fast sanity checks
- `@regression`: full suite
- `@api`: API tests
- `@a11y`: accessibility tests
- `@security`: security checks
- `@perf`: performance/load (e.g. k6)

## Safety tags (important)
- `@safe`: **non-destructive** tests (read-only)
- `@destructive`: tests that **modify data** or can affect real users

### Use `@safe` when tests are:
- Read-only UI checks (title, elements visible)
- GET-only API requests
- A11y tests
- Visual regression (if any)

### Use `@destructive` when tests:
- Reset/seed database
- Register users / modify accounts
- Checkout or payment flows
- Admin operations (create/update/delete)

## Production run behavior
`npm run test:prod` runs with:
```
--grep "@smoke|@safe"
```
So only safe tests are executed.

## Example
```ts
test('home page loads @smoke @safe @e2e', async () => {
  // ...
});
```

## See also
- [Quick Guide](./quick-guide.md)
- [Test Taxonomy](./test-taxonomy.md)
