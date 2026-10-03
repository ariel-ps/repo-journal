---
name: journal-repo
description: Record investigation findings in this repo's git-root .journal/ folder using the journal-repo CLI. Use when asked to investigate, root-cause, audit, or "write to the journal".
user-invocable: false
---

# journal-repo

Scratch investigations live at **`<git-root>/.journal/`** only (not subfolders). The CLI requires a git work tree, keeps `.journal/` gitignored by default, and prints **human-readable** output in the terminal. Use **`--plain`** or **`--json`** for scripts; **`--toon`** when you need compact structured output for agents.

Get commands and flags from the live CLI (source of truth):

- `journal-repo` — dashboard (entries, git head, gitignore policy)
- `journal-repo --help`
- `journal-repo <command> --help`

Run via the plugin on `PATH`, or `<plugin-root>/libexec/journal-repo`. Plugin `shell.zsh` / `shell.bash` enable tab completion (commands, flags, slugs via `complete slugs`).

**Requires [Treehouse](https://github.com/kunchenguid/treehouse) on PATH** — the only worktree backend journal-repo supports (no other engine or backend). Run agents in Treehouse pool slots; log with `journal-repo` (journal always on the main checkout). Use `journal-repo treehouse` to inspect roots and pool status. Do not add `.journal/` to `.worktreeinclude`.

## Rules

- One **slug** per investigation; reuse it so `add` appends to the same thread.
- `journal-repo new <slug> "title"` then edit the file for long write-ups; use `add` for one-line breadcrumbs.
- `journal-repo attach <slug> <path…>` copies repo files or folders into the entry’s bundle directory (same basename as the `.md`, without extension). Use `files <slug>` or `show <slug> --with-files` to list them.
- Never `git add .journal/` — the tool appends `.journal/` to `.gitignore` on `new`, `add`, and `path` unless `JOURNAL_REPO_ENSURE_GITIGNORE=0` (legacy: `REPO_JOURNAL_ENSURE_GITIGNORE=0`); `doctor` reports policy drift without changing it.
- If the CLI is unavailable, stop and report that journal writes cannot be
  performed safely; do not bypass its repository and symlink checks.

## Scripting

Use `--plain` for paths and raw `show` text (smoke tests and shell scripts). Use `--toon` only when integrating with TOON-aware tooling.
