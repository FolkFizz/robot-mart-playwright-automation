#!/usr/bin/env bash
set -euo pipefail

OPEN_REPORT="${1:-}"

if ! command -v allure >/dev/null 2>&1; then
  echo "Allure CLI is not installed. Install it first (for example: npm i -D allure-commandline or install globally)." >&2
  exit 1
fi

npm run report:allure

if [[ "$OPEN_REPORT" == "--open" ]]; then
  npm run report:open
fi
