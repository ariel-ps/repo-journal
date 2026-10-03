#!/usr/bin/env bash
# Smoke test: git-root journal, gitignore, new/add/list/show from subdir.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
bin="$root/bin/journal-repo"

command -v treehouse >/dev/null || {
  echo "FAIL: treehouse is required on PATH (see README)" >&2
  exit 1
}

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
cd "$tmp"
git init -q

mkdir -p sub/dir
cd sub/dir
file=$("$bin" new "Auth Timeout" "Why login times out under load" --plain)
[ -f "$file" ] || { echo "FAIL: new did not create a file" >&2; exit 1; }
[[ "$file" == *"-auth-timeout.md" ]] || { echo "FAIL: unexpected filename $file" >&2; exit 1; }
[[ "$(basename "$(dirname "$file")")" == ".journal" ]] || { echo "FAIL: not under .journal/: $file" >&2; exit 1; }
repo_root=$("$bin" root --plain)
[[ "$file" == "$repo_root/.journal/"* ]] || { echo "FAIL: journal not at git root: $file vs $repo_root" >&2; exit 1; }

grep -qx '/\.journal/' "$repo_root/.gitignore" || { echo "FAIL: .gitignore missing anchored /.journal/" >&2; exit 1; }

same_file=$("$bin" new "auth-timeout" "ignored title" --plain)
[ "$same_file" = "$file" ] || { echo "FAIL: new is not idempotent for the same day+slug" >&2; exit 1; }

"$bin" add auth-timeout "repro'd at 40 concurrent logins" --plain >/dev/null
grep -q "repro'd at 40 concurrent logins" "$file" || { echo "FAIL: add did not append" >&2; exit 1; }

"$bin" list --plain | grep -q "auth-timeout" || { echo "FAIL: list from subdir found nothing" >&2; exit 1; }
"$bin" complete slugs | grep -qx "auth-timeout" || { echo "FAIL: complete slugs missing auth-timeout" >&2; exit 1; }

echo "artifact" > "$repo_root/fixture.txt"
"$bin" attach auth-timeout "$repo_root/fixture.txt" --plain | grep -q '.journal/' || { echo "FAIL: attach did not return journal path" >&2; exit 1; }
"$bin" files auth-timeout --plain | grep -q 'fixture.txt' || { echo "FAIL: files missing attachment" >&2; exit 1; }
"$bin" list -a --plain | grep -q "auth-timeout" || { echo "FAIL: list -a compatibility failed" >&2; exit 1; }
"$bin" show auth-timeout --plain | grep -q "repro'd at 40 concurrent logins" || { echo "FAIL: show from subdir missing content" >&2; exit 1; }

"$bin" doctor --plain | grep -q '^ok$' || { echo "FAIL: doctor not ok" >&2; exit 1; }
[ "$("$bin" --plain)" = "$repo_root/.journal" ] || { echo "FAIL: dashboard --plain failed" >&2; exit 1; }
if missing=$("$bin" show missing --json); then
  echo "FAIL: missing JSON lookup unexpectedly succeeded" >&2
  exit 1
fi
printf '%s' "$missing" | grep -q '"code":"NOT_FOUND"' || {
  echo "FAIL: JSON error was not machine-readable: $missing" >&2
  exit 1
}
if unknown=$("$bin" bogus --json); then
  echo "FAIL: unknown JSON command unexpectedly succeeded" >&2
  exit 1
fi
printf '%s' "$unknown" | grep -q '"code":"VALIDATION_ERROR"' || {
  echo "FAIL: unknown command error was not JSON: $unknown" >&2
  exit 1
}

# Herdr starts actions in the plugin checkout; context must redirect the CLI to
# the focused pane's repository.
action_context=$(printf '{"focused_pane_cwd":"%s"}' "$tmp/sub/dir")
action_root=$(cd "$root" && HERDR_PLUGIN_CONTEXT_JSON="$action_context" "$bin" root --plain)
[ "$action_root" = "$repo_root" ] || {
  echo "FAIL: action context resolved $action_root instead of $repo_root" >&2
  exit 1
}

# Installed layout: launcher + libexec binary produced by the plugin build.
isolated="$tmp/plugin bundle"
mkdir -p "$isolated/bin" "$isolated/libexec"
cp "$root/bin/journal-repo" "$isolated/bin/journal-repo"
if [ ! -x "$root/libexec/journal-repo" ]; then
  sh "$root/scripts/build/install.sh"
fi
cp "$root/libexec/journal-repo" "$isolated/libexec/journal-repo"
chmod +x "$isolated/bin/journal-repo" "$isolated/libexec/journal-repo"
"$isolated/bin/journal-repo" --version >/dev/null || {
  echo "FAIL: libexec binary missing; run scripts/build/install.sh" >&2
  exit 1
}

echo "ok"
