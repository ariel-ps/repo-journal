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

Built with [AXI](https://axi.md) ([`axi-sdk-js`](https://www.npmjs.com/package/axi-sdk-js), [`@toon-format/toon`](https://www.npmjs.com/package/@toon-format/toon)). Node **20+** required at runtime.

## Install

**Via [Herdr Setup](https://github.com/ariel-ps/herdr-setup)** (recommended): included in `dependencies.json` as a generic repo tool, delivered as a Herdr plugin for PATH and pane actions.

Standalone (Herdr 0.9.3+ host):

```sh
herdr plugin install ariel-ps/repo-journal --ref main --yes
```

Node **20+** required. Bun is only needed to rebuild the bundled runtime.

## Develop

```sh
bun install --registry https://registry.npmjs.org
bun run build
bash tests/smoke.sh
bun run test
python3 tests/test_manifest.py
```

The committed `dist/` bundle includes runtime dependencies, allowing
installation without Bun when it is already current. The build contract checks
the bundle with Node before installation succeeds.

## Repository layout

- `src/` contains the TypeScript implementation.
- `bin/repo-journal` is the stable shell launcher.
- `dist/` contains the committed, bundled Node runtime.
- `skills/repo-journal/` contains the agent skill.
- `tests/` contains TypeScript, smoke, and manifest contract tests.

## License

[MIT](LICENSE)
