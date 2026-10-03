# Repo Journal

CLI for **git-root** investigation scratch files in `.journal/`, plus a bundled agent skill.

- Requires a **git work tree** (`git rev-parse --show-toplevel`).
- Writes only under **`<repo>/.journal/`** (works from any subdirectory).
- Appends **`.journal/`** to `.gitignore` by default (`REPO_JOURNAL_ENSURE_GITIGNORE=0` to disable).
- **Human-readable** tables and messages in the terminal; **`--plain`** for scripts; **`--json`** or **`--toon`** for agents.

```sh
repo-journal                                    # dashboard
repo-journal new auth-timeout "Why login times out" --plain
repo-journal add auth-timeout "repro at 40 logins"
repo-journal list
repo-journal show auth-timeout --full
repo-journal attach auth-timeout logs/error.txt
repo-journal files auth-timeout
repo-journal doctor
```

Each entry is a markdown file plus an optional **bundle directory** with the same basename (for example `.journal/2026-10-03-auth-timeout/` next to `2026-10-03-auth-timeout.md`). `attach` **copies** files or folders from inside the git repository into that bundle and logs a bullet in the entry. Paths outside the repo or under `.journal/` are rejected.

### Requires [Treehouse](https://github.com/kunchenguid/treehouse)

Repo Journal is a thin journal layer on top of Treehouse. It does **not** implement worktree pooling: every command expects `treehouse` on `PATH`. Workspace roots and pool status come from Treehouse; this tool only writes `.journal/`, attachments, and gitignore policy on the **main checkout** while you or agents work in pool slots.

```sh
curl -fsSL https://kunchenguid.github.io/treehouse/install.sh | sh
repo-journal engine    # treehouse version, active vs journal root, pool summary
```

Do **not** add `.journal/` to `.worktreeinclude` — the journal stays on the main tree only.

Rust implementation. Optional [TOON](https://github.com/toon-format/toon) via `--toon` (`serde_toon_format`). No Node runtime.

## Install

**Via [Herdr Setup](https://github.com/ariel-ps/herdr-setup)** (recommended): included in `dependencies.json` as a generic repo tool, delivered as a Herdr plugin for PATH and pane actions.

Standalone (Herdr 0.9.3+ host):

```sh
herdr plugin install ariel-ps/repo-journal --ref main --yes
```

Rebuild requires **Rust/Cargo** (see `rust-version` in `Cargo.toml`). `scripts/build/install.sh` places the release binary in `libexec/` (gitignored, like Herdr Alerts).

### Tab completion

Herdr loads `shell.zsh` / `shell.bash`, which register completion for `repo-journal` (commands, flags, and journal slugs from the current git repo).

Standalone:

```sh
source /path/to/repo-journal/completions/repo-journal.zsh   # zsh
source /path/to/repo-journal/completions/repo-journal.bash # bash
```

Slugs come from `repo-journal complete slugs` (one slug per line; empty outside a git repo).

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
- `libexec/repo-journal` — release binary (built locally; gitignored).
- `completions/` — bash and zsh tab completion.
- `skills/repo-journal/` — agent skill.
- `tests/` — smoke and manifest contract tests.

## License

[MIT](LICENSE)
