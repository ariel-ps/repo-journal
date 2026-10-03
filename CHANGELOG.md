# Changelog

## 0.4.0

- Rewrote the CLI in **Rust** (drops Node/Bun runtime; committed `libexec/repo-journal` binary).
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
- Node 20+ runtime via `bin/repo-journal` wrapper → `dist/bin/repo-journal.js`.

## 0.1.0

- Bash CLI, skill, and Herdr plugin action.
