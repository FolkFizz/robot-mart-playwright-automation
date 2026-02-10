#!/usr/bin/env bash
set -euo pipefail

npx playwright test tests/a11y --grep "@a11y" "$@"