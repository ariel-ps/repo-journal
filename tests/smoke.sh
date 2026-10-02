#!/usr/bin/env bash
# Smoke test: exercise new/add/list/show/path against a throwaway project dir.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
bin="$root/bin/herdr-journal"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cd "$tmp"
git init -q

file=$("$bin" new "Auth Timeout" "Why login times out under load")
[ -f "$file" ] || { echo "FAIL: new did not create a file" >&2; exit 1; }
[[ "$file" == *"-auth-timeout.md" ]] || { echo "FAIL: unexpected filename $file" >&2; exit 1; }

same_file=$("$bin" new "auth-timeout" "ignored title")
[ "$same_file" = "$file" ] || { echo "FAIL: new is not idempotent for the same day+slug" >&2; exit 1; }

"$bin" add auth-timeout "repro'd at 40 concurrent logins" >/dev/null
grep -q "repro'd at 40 concurrent logins" "$file" || { echo "FAIL: add did not append" >&2; exit 1; }

mkdir -p sub/dir && cd sub/dir
"$bin" list | grep -q "auth-timeout" || { echo "FAIL: list from subdir found nothing" >&2; exit 1; }
"$bin" show auth-timeout | grep -q "repro'd at 40 concurrent logins" || { echo "FAIL: show from subdir missing content" >&2; exit 1; }

echo "ok"
