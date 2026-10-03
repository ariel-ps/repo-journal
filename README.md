# Repo Journal

AXI-style CLI for **git-root** investigation scratch files in `.journal/`, plus a bundled agent skill.

- Requires a **git work tree** (`git rev-parse --show-toplevel`).
- Writes only under **`<repo>/.journal/`** (works from any subdirectory).
- Appends **`.journal/`** to `.gitignore` by default (`REPO_JOURNAL_ENSURE_GITIGNORE=0` to disable).
- **TOON** output by default; **`--plain`** for scripts; **`--json`** for machines.

```sh
repo-journal                                    # dashboard
repo-journal new auth-timeout "Why login times out" --plain
repo-journal add auth-timeout "repro at 40 logins"
repo-journal list
repo-journal show auth-timeout --full
repo-journal doctor
```

Rust implementation with [TOON](https://github.com/toon-format/toon) via `serde_toon_format`. No Node runtime.

## Install

**Via [Herdr Setup](https://github.com/ariel-ps/herdr-setup)** (recommended): included in `dependencies.json` as a generic repo tool, delivered as a Herdr plugin for PATH and pane actions.

Standalone (Herdr 0.9.3+ host):

```sh
herdr plugin install ariel-ps/repo-journal --ref main --yes
```

Rebuild requires **Rust/Cargo** (see `rust-version` in `Cargo.toml`). `scripts/build/install.sh` places the release binary in `libexec/` (gitignored, like Herdr Alerts).

## Develop

```sh
cargo build --release
sh scripts/build/install.sh
bash tests/smoke.sh
cargo test
python3 tests/test_manifest.py
```

## Repository layout

- `src/` — Rust CLI and library.
- `bin/repo-journal` — shell launcher on `PATH`.
- `libexec/repo-journal` — release binary (committed for Node-free install).
- `skills/repo-journal/` — agent skill.
- `tests/` — smoke and manifest contract tests.

## License

[MIT](LICENSE)
