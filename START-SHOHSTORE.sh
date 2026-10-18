#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  printf 'Install Node.js 24 or newer from https://nodejs.org/ and try again.\n'
  exit 1
fi
exec node scripts/launch.mjs
