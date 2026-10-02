---
name: herdr-journal
description: Record an investigation's findings into this project's hidden .journal/ folder using the herdr-journal CLI instead of ad-hoc files. Use whenever asked to investigate, look into, dig into, root-cause, or audit something, or when told to "write it to the journal" / "create a .journal folder".
---

# herdr-journal

A `.journal/` folder at the project root holds dated investigation notes —
one Markdown file per investigation, named `YYYY-MM-DD-<slug>.md`. The
`herdr-journal` CLI (installed on `PATH` by this plugin) creates, appends to,
lists, and shows these files so every investigation uses the same shape
instead of a freehand file write.

## Starting an investigation

```bash
herdr-journal new "auth-timeout" "Why login times out under load"
```

Prints the path to the new (or already-existing today's) entry. Use that
path with your normal file tools for substantial writing — headings,
evidence, code excerpts, conclusions.

## Logging a quick finding without opening the file

```bash
herdr-journal add auth-timeout "repro'd: pool exhausts at 40 concurrent logins"
```

Appends a timestamped bullet to the slug's latest entry, creating one first
if none exists yet.

## Recalling past investigations

```bash
herdr-journal list          # last 20 entries in this project, newest first
herdr-journal list --all    # every entry
herdr-journal show auth-timeout   # print the most recent matching entry
```

`herdr-journal list`/`show` search upward from the current directory for an
existing `.journal/`, or the nearest `.git` root, so these work from any
subdirectory of the project.

## Conventions

- One slug per distinct investigation; reuse the same slug across a session
  so `add` keeps appending to the same file instead of fragmenting.
- Slugs are lowercased and non-alphanumeric runs become `-`
  (`"Auth Timeout!"` → `auth-timeout`).
- Prefer `herdr-journal new` + direct file edits for anything with structure
  (multiple sections, code blocks); prefer `add` for one-line breadcrumbs.
- If `herdr-journal` isn't on `PATH` (plugin not installed), fall back to
  writing `.journal/YYYY-MM-DD-<slug>.md` by hand with the same naming
  convention, so the files stay compatible either way.
