# CI Pipeline

Summary of GitHub Actions workflows and how they map to tags.

## Workflows
- `.github/workflows/ui-smoke.yml`
- `.github/workflows/api.yml`
- `.github/workflows/a11y.yml`
- `.github/workflows/regression-nightly.yml`
- `.github/workflows/k6-nightly.yml`

## Typical commands
- UI Smoke:
  ```bash
  npx playwright test --grep "@smoke" --grep-invert "@stripe|@chaos|@ai"
  ```
- API:
  ```bash
  npx playwright test tests/api --grep "@api"
  ```
- A11y:
  ```bash
  npx playwright test tests/a11y --grep "@a11y"
  ```

## Notes
- Smoke is fast and PR-friendly.
- Regression and load/perf are scheduled.
- Production-safe runs should use `@safe` tags only.
- Prod runs skip reset/seed automatically when BASE_URL points to Render.

## See also
- [Quick Guide](./quick-guide.md)
- [Tagging Convention](./tagging-convention.md)
