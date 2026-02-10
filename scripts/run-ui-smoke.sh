#!/usr/bin/env bash
set -euo pipefail

npx playwright test --grep "@smoke" --grep-invert "@stripe|@chaos|@ai" "$@"