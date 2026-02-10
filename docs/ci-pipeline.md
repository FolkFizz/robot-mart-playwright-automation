# CI Pipeline

Active GitHub Actions workflows are configured under `.github/workflows/`.

## Current Status

- Active PR/main checks:
  - `.github/workflows/quick-regression.yml`
  - `.github/workflows/ui-smoke.yml`
  - `.github/workflows/api.yml`
  - `.github/workflows/a11y.yml`
- Active scheduled workflows:
  - `.github/workflows/regression-nightly.yml`
  - `.github/workflows/k6-nightly.yml`

## Workflow Summary

| Workflow             | Trigger                  | Main Scope                                    | Default Filters                                                                                                        |
| -------------------- | ------------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `quick-regression`   | PR + push + manual       | quality gate + cross-suite quick regression   | `npm run ci:quick` (includes `@smoke` and `@regression`; excludes `@chat`, `@ai`, `@chaos`, `@stripe`, `@destructive`) |
| `ui-smoke`           | PR + push + manual       | `tests/e2e`, `tests/security`, `tests/a11y`   | include `@smoke` or `@safe`; exclude `@chat`, `@ai`, `@stripe`, `@chaos`, `@destructive`                               |
| `api`                | PR + push + manual       | `tests/api`                                   | include `@smoke` or `@security`; exclude `@chat`, `@ai`, `@admin`, `@destructive`                                      |
| `a11y`               | PR + push + manual       | `tests/a11y`                                  | include `@smoke`; exclude `@stripe`, `@destructive`, `@chat`, `@ai`                                                    |
| `regression-nightly` | weekly schedule + manual | API/E2E/Security + selected Integration specs | include `@regression`; exclude `@chat`, `@ai`, `@chaos`, `@stripe` (`@destructive` excluded by default)                |
| `k6-nightly`         | weekly schedule + manual | k6 suite via `scripts/run-perf-suite.js`      | default profile `gate`                                                                                                 |

## URL Resolution

Playwright workflows resolve URL in this order:

1. Manual dispatch input `base_url` (if provided by that workflow)
2. Repository variable `BASE_URL`
3. Fallback: `https://robot-store-sandbox.onrender.com`

k6 workflow resolves URL in this order:

1. Manual dispatch input `base_url`
2. `PERF_BASE_URL` repository variable
3. `REAL_URL` repository variable (legacy)
4. `BASE_URL`
5. Fallback: `https://robot-store-sandbox.onrender.com`

## Cost / Free-Tier Controls

- `concurrency` is enabled to cancel overlapping runs per workflow.
- PR/push workflows use path filters to avoid running on unrelated changes.
- Nightly jobs are scheduled weekly (not daily) to reduce runner-minute usage.
- Automated pipelines exclude `@chat/@ai` by default, so they do not intentionally call external LLM endpoints.

## LLM / Gemini Token Notes

- This repository does not inject Gemini API keys in workflows by default.
- Chat-related tests are excluded in automatic CI runs unless manually enabled in `regression-nightly` (`include_chat_ai=true`).
- If your target app itself calls Gemini in backend logic for non-chat routes, that is outside CI control and still depends on app behavior.

## Artifacts

- Playwright workflows upload:
  - `playwright-report`
  - `test-results`
  - `allure-results`
  - `allure-report`
- k6 workflow uploads:
  - `performance/results/latest.txt`
  - `performance/results/<run-id>/` (manifest + logs + summaries)

## Health Metrics Snapshot

Metric policy:

- Playwright metrics use latest `ci:quick` JSON report (`test-results/quick-regression.json`, last refreshed on February 10, 2026)
- k6 metrics use latest gate manifest (`performance/results/20260209-122753-gate/manifest.json`)

| Platform                          | Pass Rate                                                    | Flake Rate                                                   | Avg Runtime               | p95                                                           |
| --------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------- |
| Playwright (`ci:quick`, chromium) | `87.65%` (`71/81` executed, `31` skipped after max-failures) | `0.00%`                                                      | `2.41s` per executed test | `16.47s` test duration p95                                    |
| k6 (gate profile)                 | `70.00%` (`7/10` runs)                                       | `0.00%` (rerun disagreement not detected in latest baseline) | `104.46s` per scenario    | `8.92s` (`http_req_duration` worst p95 across gate scenarios) |

To refresh Playwright metrics after a new quick run:

1. Run `npm run ci:quality`
2. Run `npm run test:quick-regression -- --reporter=json > test-results/quick-regression.json`
3. Run `npm run metrics:playwright -- test-results/quick-regression.json`

## Production Safety

- Reset/seed hooks are guarded: when `BASE_URL` points to `robot-store-sandbox.onrender.com`, destructive reset/seed actions are skipped.
- Keep destructive suites for controlled environments unless explicitly required.

## See also

- [Quick Guide](./quick-guide.md)
- [Tagging Convention](./tagging-convention.md)
