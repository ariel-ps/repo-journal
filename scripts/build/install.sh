#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd -P)
entry="$root/dist/bin/repo-journal.js"

command -v node >/dev/null 2>&1 || {
  echo "repo-journal: Node 20 or newer is required" >&2
  exit 1
}
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)' || {
  echo "repo-journal: Node 20 or newer is required" >&2
  exit 1
}

if command -v bun >/dev/null 2>&1; then
  (
    cd "$root"
    bun install --frozen-lockfile
    bun run build
  )
fi

[ -f "$entry" ] || {
  echo "repo-journal: missing bundled runtime $entry; install Bun and rebuild" >&2
  exit 1
}
node "$entry" --version >/dev/null
