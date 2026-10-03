# Changelog

## 0.8.2

- Removed deprecated `engine` command, `REPO_JOURNAL_*` env vars, and `REPO_JOURNAL_CLI` shell export.

## 0.8.1

- Treehouse is the only worktree backend: `journal-repo treehouse` replaces generic `engine` in docs; `engine` remains a deprecated alias.
- Dashboard/JSON drop the generic `engine` field; use `treehouse_version` and `treehouse_pool`.

## 0.8.0

- Renamed CLI and Herdr plugin to **journal-repo** (`dev.ariel.journal-repo`). GitHub repository remains `ariel-ps/repo-journal`.
- Completions, skill, and env vars: prefer `JOURNAL_REPO_*`; `REPO_JOURNAL_*` kept as deprecated aliases where noted.

## 0.4.1

- Git-ignore `libexec/journal-repo` so plugin builds do not dirty Herdr’s managed clone (fixes setup “local changes” on reinstall).

## 0.4.0

- Rewrote the CLI in **Rust** (drops Node/Bun runtime; committed `libexec/journal-repo` binary).
- Preserves commands, `--plain` / `--json`, Herdr pane context, and gitignore safety behavior.

## 0.3.1

- Renamed from **herdr-journal** to **repo-journal** (generic repo tool; still installable via Herdr Setup / `herdr plugin install`).
- Plugin id: `dev.ariel.repo-journal`; repository: `ariel-ps/repo-journal`.

## 0.3.0

- AXI CLI (`axi-sdk-js`): dashboard, TOON output, structured errors, contextual `help` suggestions.
- **Breaking:** command output is now TOON by default; pass `--plain` for the
  path and raw-text output used by 0.1 scripts.
- Git required; journal dir fixed at **repository root** `.journal/`.
- Auto **`ensure-gitignore`** for `.journal/` (disable with `REPO_JOURNAL_ENSURE_GITIGNORE=0`).
- Commands: `root`, `doctor`, `ensure-gitignore`; flags `--plain`, `--json`, `show --full`.
- Node 20+ runtime via `bin/journal-repo` wrapper → `dist/bin/journal-repo.js`.

## 0.1.0

- Bash CLI, skill, and Herdr plugin action.
