---
name: journal-repo
description: Record investigation findings in this repo's git-root .journal/ folder using the journal-repo CLI. Use when asked to investigate, root-cause, audit, resume prior work, or "write to the journal".
user-invocable: false
---

# journal-repo

Scratch investigations live at **`<git-root>/.journal/`** on the **main** checkout (not in Treehouse pool slots). The CLI works from any worktree cwd; it resolves the journal on main automatically. Requires **`treehouse`** on PATH.

Get commands from the live CLI:

- `journal-repo --help`
- `journal-repo <command> --help`

Run via Herdr plugin `PATH`, or `<plugin-root>/bin/journal-repo`.

## Resume / handoff (read before continuing work)

When picking up an investigation—or starting a new turn on the same topic—load prior context through the **CLI**, not by guessing paths under the workspace (pool slots often have no `.journal/` in the file tree).

1. List threads: `journal-repo list --plain` or `journal-repo complete slugs`
2. Load everything for one slug (metadata + attachments + full markdown):

   ```bash
   journal-repo show <slug> --context --plain
   ```

   For structured tooling: `journal-repo show <slug> --context --json`

3. Read attachment files using paths from the `attachments:` section (relative to **journal root** / main checkout).
4. After work: `journal-repo add <slug> "…"` for breadcrumbs; edit the `.md` for long notes, URLs, and research; `journal-repo attach <slug> <repo-path…>` for evidence copies.

Same slug across days appends to the latest matching entry; reuse the slug so findings stay one thread.

## Write path

- `journal-repo new <slug> "title"` — create or reuse today's entry
- `journal-repo add <slug> "<finding>"` — append a timestamped bullet
- `journal-repo attach <slug> <path…>` — copy repo files/folders into the entry bundle
- `journal-repo files <slug>` — list attachment paths
- `journal-repo treehouse` — active vs journal root, pool summary

## Rules

- Never `git add .journal/` — auto-gitignore unless `JOURNAL_REPO_ENSURE_GITIGNORE=0`
- Do not bypass the CLI to write under `.journal/` (symlink and path checks exist for a reason)
- If `journal-repo` is unavailable, stop and report that journal access failed

## Scripting

- **`--plain`** — paths, raw text, and `--context` handoff blocks
- **`--json`** — machine-readable payloads
- **`--toon`** — TOON for TOON-aware agents only
