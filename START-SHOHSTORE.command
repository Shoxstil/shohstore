#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  printf 'Install Node.js 24 or newer from https://nodejs.org/ and try again.\n'
  printf 'Press Enter to close.\n'
  read -r answer
  exit 1
fi
node scripts/launch.mjs
result=$?
if [ "$result" -ne 0 ]; then
  printf 'Press Enter to close.\n'
  read -r answer
fi
exit "$result"
