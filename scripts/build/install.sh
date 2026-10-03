#!/bin/sh
set -eu

root=$(CDPATH='' cd -- "$(dirname -- "$0")/../.." && pwd -P)

command -v cargo >/dev/null 2>&1 || {
  echo "journal-repo: Rust/Cargo is required to build this plugin" >&2
  exit 1
}

cargo build --release --locked --manifest-path "$root/Cargo.toml" --target-dir "$root/target"
mkdir -p "$root/libexec"
cp "$root/target/release/journal-repo" "$root/libexec/.journal-repo.$$"
mv "$root/libexec/.journal-repo.$$" "$root/libexec/journal-repo"
"$root/libexec/journal-repo" --version >/dev/null
