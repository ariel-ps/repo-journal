#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd -P)

command -v cargo >/dev/null 2>&1 || {
  echo "repo-journal: Rust/Cargo is required to build this plugin" >&2
  exit 1
}

cargo build --release --locked --manifest-path "$root/Cargo.toml" --target-dir "$root/target"
mkdir -p "$root/libexec"
cp "$root/target/release/repo-journal" "$root/libexec/.repo-journal.$$"
mv "$root/libexec/.repo-journal.$$" "$root/libexec/repo-journal"
"$root/libexec/repo-journal" --version >/dev/null
