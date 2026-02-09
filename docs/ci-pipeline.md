# CI Pipeline

Active GitHub Actions workflows are configured under `.github/workflows/`.

## Current Status (February 9, 2026)

- Active PR/main checks:
  - `.github/workflows/ui-smoke.yml`
  - `.github/workflows/api.yml`
  - `.github/workflows/a11y.yml`
- Active scheduled workflows:
  - `.github/workflows/regression-nightly.yml`
  - `.github/workflows/k6-nightly.yml`

## Workflow Summary

| Workflow | Trigger | Main scope | Default filters |
| --- | --- | --- | --- |
| `ui-smoke` | PR + push + manual | `tests/e2e`, `tests/security`, `tests/a11y` | include `@smoke|@safe`, exclude `@chat|@ai|@stripe|@chaos|@destructive` |
| `api` | PR + push + manual | `tests/api` | include `@smoke|@security`, exclude `@chat|@ai|@admin|@destructive` |
| `a11y` | PR + push + manual | `tests/a11y` | include `@smoke`, exclude `@stripe|@destructive|@chat|@ai` |
| `regression-nightly` | weekly schedule + manual | API/E2E/Security + selected Integration specs | include `@regression`, exclude `@chat|@ai|@chaos|@stripe` (+ `@destructive` by default) |
| `k6-nightly` | weekly schedule + manual | k6 suite via `scripts/run-perf-suite.js` | default profile `gate` |

## URL Resolution

All workflows resolve target URL in this order:

1. Manual dispatch input `base_url` (if provided)
2. Repository variable `BASE_URL`
3. Fallback: `https://robot-store-sandbox.onrender.com`

k6 tests additionally support `REAL_URL` via repo variable for direct override in `performance/lib/config.js`.

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
- k6 workflow uploads:
  - `performance/results/latest.txt`
  - `performance/results/<run-id>/` (manifest + logs + summaries)

## Production Safety

- Reset/seed hooks are guarded: when `BASE_URL` points to `robot-store-sandbox.onrender.com`, destructive reset/seed actions are skipped.
- Keep destructive suites for controlled environments unless explicitly required.

## See also

- [Quick Guide](./quick-guide.md)
- [Tagging Convention](./tagging-convention.md)
