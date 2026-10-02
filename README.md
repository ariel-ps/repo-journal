# Herdr Journal

A lightweight CLI for the `.journal/` investigation-notes convention, plus a
bundled skill so Claude Code (and other agents) use it consistently instead
of freehand files.

```sh
herdr-journal new "auth-timeout" "Why login times out under load"   # -> path
herdr-journal add auth-timeout "repro'd at 40 concurrent logins"
herdr-journal list [--all]
herdr-journal show auth-timeout
herdr-journal path
```

Entries live at `<project root>/.journal/YYYY-MM-DD-<slug>.md`. `list` and
`show` search upward from the current directory for an existing `.journal/`
or the nearest `.git` root, so they work from any subdirectory.

No daemon, no database, no dependencies beyond coreutils — it's one shell
script.

## Install

[Herdr Setup](https://github.com/ariel-ps/herdr-setup) installs prerequisites
and lets you select this plugin in `dependencies.json`.

With Herdr 0.9.3+ already installed:

```sh
herdr plugin install ariel-ps/herdr-journal --ref main --yes
```

Use a commit or release tag instead of `main` to pin a version. Supports
macOS and Ubuntu/Debian Linux.

Installing the plugin also makes the `herdr-journal` skill available to
Claude Code, so agents reach for the CLI automatically when asked to
investigate something.

## License

Original project code is licensed under the [MIT License](LICENSE).
