#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/run-k6.sh <k6-script-path> [extra-args...]" >&2
  exit 1
fi

SCRIPT_PATH="$1"
shift

node scripts/run-k6.js "$SCRIPT_PATH" "$@"