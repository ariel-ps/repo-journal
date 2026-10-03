import { relative } from "node:path";
import { AxiError } from "axi-sdk-js";
import type { Renderable } from "./render.js";
import type { JournalContext } from "./context.js";
import { gitStatus, listTrackedJournalFiles } from "./git.js";
import {
  ensureJournalGitignore,
  journalIgnoredInGitignore,
} from "./gitignore.js";
import { parseGlobalFlags, takeFlag } from "./flags.js";
import {
  cmdAdd,
  cmdNew,
  latestForSlug,
  listEntries,
  readEntryContent,
  requireSlug,
  ensureJournalDir,
} from "./journal.js";
import { homeHeader, withHelp } from "./render.js";

export const DESCRIPTION =
  "Git-root .journal/ scratch for agent investigations. TOON by default; --plain for scripting.";

const DEFAULT_LIST = 20;

function rel(ctx: JournalContext, abs: string): string {
  return relative(ctx.repoRoot, abs) || abs;
}

function shouldEnsureGitignore(): boolean {
  return process.env.REPO_JOURNAL_ENSURE_GITIGNORE !== "0";
}

function ensurePolicy(ctx: JournalContext): "ok" | "appended" | "skipped" {
  if (!shouldEnsureGitignore()) return "skipped";
  return ensureJournalGitignore(ctx.repoRoot);
}

export async function homeCommand(
  _args: string[],
  context?: JournalContext,
): Promise<Renderable> {
  if (!context) throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped } = parseGlobalFlags(_args);
  if (stripped.length > 0) {
    throw new AxiError(`unexpected arguments: ${stripped.join(" ")}`, "VALIDATION_ERROR", [
      "run with no arguments for the dashboard",
    ]);
  }

  const git = gitStatus(context.repoRoot);
  const tracked = listTrackedJournalFiles(context.repoRoot);
  const gitignoreOk = journalIgnoredInGitignore(context.repoRoot);
  const entries = listEntries(context.journalDir);
  const recent = entries.slice(0, DEFAULT_LIST);

  const body = mergeDashboard(context, git, gitignoreOk, tracked.length, entries, recent);
  if (plain) return context.journalDir;
  if (json) return JSON.stringify(body);
  return body;
}

function mergeDashboard(
  ctx: JournalContext,
  git: ReturnType<typeof gitStatus>,
  gitignoreOk: boolean,
  trackedCount: number,
  entries: ReturnType<typeof listEntries>,
  recent: ReturnType<typeof listEntries>,
): Record<string, unknown> {
  return withHelp(
    {
      ...homeHeader(DESCRIPTION),
      repo_root: ctx.repoRoot,
      journal_dir: ctx.journalDir,
      git,
      policy: {
        gitignore: gitignoreOk ? "ok" : "missing",
        tracked_journal_files: trackedCount,
        ensure_gitignore: shouldEnsureGitignore(),
      },
      summary: {
        entries_total: entries.length,
        entries_shown: recent.length,
        empty: entries.length === 0,
      },
      entries_recent: recent.map((e) => ({
        slug: e.slug,
        date: e.date,
        title: e.title,
      })),
    },
    entries.length
      ? [
          `repo-journal show ${recent[0]?.slug ?? "<slug>"}`,
          "repo-journal new <slug> \"<title>\"",
        ]
      : ["repo-journal new <slug> \"<title>\""],
  );
}

export async function newCommand(
  args: string[],
  context?: JournalContext,
): Promise<Renderable> {
  if (!context) throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped } = parseGlobalFlags(args);
  if (stripped.length < 1) {
    throw new AxiError("new requires a slug", "VALIDATION_ERROR", [
      "repo-journal new auth-timeout \"Why login times out\"",
    ]);
  }
  const slugRaw = stripped[0];
  requireSlug(slugRaw);
  const titleWords = stripped.slice(1);
  const gitignore = ensurePolicy(context);
  const { path, created, slug } = cmdNew(
    context.journalDir,
    slugRaw,
    titleWords,
  );
  if (plain) return path;
  const body = withHelp(
    {
      ok: {
        op: "new",
        slug,
        path: rel(context, path),
        created,
        gitignore,
      },
    },
    [`repo-journal add ${slug} \"<finding>\"`, `repo-journal show ${slug}`],
  );
  if (json) return JSON.stringify(body);
  return body;
}

export async function addCommand(
  args: string[],
  context?: JournalContext,
): Promise<Renderable> {
  if (!context) throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped } = parseGlobalFlags(args);
  if (stripped.length < 2) {
    throw new AxiError("add requires a slug and note text", "VALIDATION_ERROR", [
      "repo-journal add auth-timeout \"repro at 40 logins\"",
    ]);
  }
  const slugRaw = stripped[0];
  requireSlug(slugRaw);
  const noteParts = stripped.slice(1);
  ensurePolicy(context);
  const { path, slug } = cmdAdd(context.journalDir, slugRaw, noteParts);
  if (plain) return path;
  const body = withHelp(
    {
      ok: {
        op: "add",
        slug,
        path: rel(context, path),
      },
    },
    [`repo-journal show ${slug}`, `repo-journal show ${slug} --full`],
  );
  if (json) return JSON.stringify(body);
  return body;
}

export async function listCommand(
  args: string[],
  context?: JournalContext,
): Promise<Renderable> {
  if (!context) throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped: afterGlobal } = parseGlobalFlags(args);
  const longAll = takeFlag(afterGlobal, "--all");
  const shortAll = takeFlag(longAll.args, "-a");
  const stripped = shortAll.args;
  const all = longAll.present || shortAll.present;
  if (stripped.length > 0) {
    throw new AxiError(`unexpected arguments: ${stripped.join(" ")}`, "VALIDATION_ERROR");
  }

  const entries = listEntries(context.journalDir);
  const shown = all ? entries : entries.slice(0, DEFAULT_LIST);

  if (plain) {
    return shown.map((e) => `${e.basename}  ${e.title}`).join("\n");
  }

  const body =
    entries.length === 0
      ? withHelp(
          {
            entries: [],
            summary: { shown: 0, total: 0, empty: true },
          },
          ["repo-journal new <slug> \"<title>\""],
        )
      : withHelp(
          {
            entries: shown.map((e) => ({
              slug: e.slug,
              date: e.date,
              title: e.title,
            })),
            summary: {
              shown: shown.length,
              total: entries.length,
              truncated: !all && entries.length > DEFAULT_LIST,
            },
          },
          ["repo-journal show <slug>", "repo-journal list --all"],
        );

  if (json) return JSON.stringify(body);
  return body;
}

export async function showCommand(
  args: string[],
  context?: JournalContext,
): Promise<Renderable> {
  if (!context) throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped: afterGlobal } = parseGlobalFlags(args);
  const { args: stripped, present: full } = takeFlag(afterGlobal, "--full");
  if (stripped.length !== 1) {
    throw new AxiError("show requires exactly one slug", "VALIDATION_ERROR", [
      "repo-journal show auth-timeout",
    ]);
  }
  const slug = requireSlug(stripped[0]);
  const file = latestForSlug(context.journalDir, slug);
  if (!file) {
    throw new AxiError(
      `no entry matching '${stripped[0]}' under ${context.journalDir}`,
      "NOT_FOUND",
      ["repo-journal list", `repo-journal new ${stripped[0]} \"<title>\"`],
    );
  }
  const { content, truncated } = readEntryContent(file, full || plain);
  if (plain) return content;
  const body = withHelp(
    {
      slug,
      path: rel(context, file),
      truncated,
      content,
    },
    truncated ? [`repo-journal show ${slug} --full`] : [],
  );
  if (json) return JSON.stringify(body);
  return body;
}

export async function pathCommand(
  args: string[],
  context?: JournalContext,
): Promise<Renderable> {
  if (!context) throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped } = parseGlobalFlags(args);
  if (stripped.length > 0) {
    throw new AxiError(`unexpected arguments: ${stripped.join(" ")}`, "VALIDATION_ERROR");
  }
  ensureJournalDir(context.journalDir);
  ensurePolicy(context);
  if (plain) return context.journalDir;
  const body = { journal_dir: context.journalDir };
  if (json) return JSON.stringify(body);
  return body;
}

export async function rootCommand(
  args: string[],
  context?: JournalContext,
): Promise<Renderable> {
  if (!context) throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped } = parseGlobalFlags(args);
  if (stripped.length > 0) {
    throw new AxiError(`unexpected arguments: ${stripped.join(" ")}`, "VALIDATION_ERROR");
  }
  if (plain) return context.repoRoot;
  const body = { repo_root: context.repoRoot };
  if (json) return JSON.stringify(body);
  return body;
}

export async function doctorCommand(
  args: string[],
  context?: JournalContext,
): Promise<Renderable> {
  if (!context) throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped } = parseGlobalFlags(args);
  if (stripped.length > 0) {
    throw new AxiError(`unexpected arguments: ${stripped.join(" ")}`, "VALIDATION_ERROR");
  }

  const git = gitStatus(context.repoRoot);
  const tracked = listTrackedJournalFiles(context.repoRoot);
  const gitignoreOk = journalIgnoredInGitignore(context.repoRoot);
  const issues: string[] = [];
  if (!gitignoreOk) issues.push("gitignore_missing");
  if (tracked.length > 0) issues.push("journal_tracked_in_git");

  const body = withHelp(
    {
      ok: issues.length === 0,
      repo_root: context.repoRoot,
      journal_dir: context.journalDir,
      git,
      gitignore: gitignoreOk ? "ok" : "missing",
      tracked_journal_files: tracked.length,
      tracked_paths: tracked.slice(0, 5),
      issues,
    },
    [
      ...(gitignoreOk ? [] : ["repo-journal ensure-gitignore"]),
      ...(tracked.length
        ? ["git rm -r --cached .journal/  # then commit if you intentionally track nothing"]
        : []),
      "repo-journal new <slug> \"<title>\"",
    ],
  );

  if (plain) return issues.length === 0 ? "ok" : issues.join(",");
  if (json) return JSON.stringify(body);
  return body;
}

export async function ensureGitignoreCommand(
  args: string[],
  context?: JournalContext,
): Promise<Renderable> {
  if (!context) throw new AxiError("journal context missing", "UNKNOWN");
  const { plain, json, stripped } = parseGlobalFlags(args);
  if (stripped.length > 0) {
    throw new AxiError(`unexpected arguments: ${stripped.join(" ")}`, "VALIDATION_ERROR");
  }
  const result = ensureJournalGitignore(context.repoRoot);
  if (plain) return result;
  const body = withHelp(
    { ok: { op: "ensure-gitignore", result } },
    ["repo-journal doctor"],
  );
  if (json) return JSON.stringify(body);
  return body;
}

export const TOP_HELP = `usage: repo-journal [command] [args] [flags]
commands[10]:
  (none)=dashboard, dashboard, new, add, list, show, path, root, doctor, ensure-gitignore
flags[3]:
  --plain (scripting: paths or raw text), --json (machine-readable), --help, -v/--version
examples:
  repo-journal
  repo-journal new auth-timeout "Why login times out" --plain
  repo-journal add auth-timeout "repro at 40 logins"
  repo-journal list
  repo-journal show auth-timeout --full
  repo-journal doctor
`;

export const COMMAND_HELP: Record<string, string> = {
  dashboard: "usage: repo-journal dashboard [--plain|--json]",
  new: "usage: repo-journal new <slug> [title words...] [--plain|--json]",
  add: "usage: repo-journal add <slug> <text...> [--plain|--json]",
  list: "usage: repo-journal list [--all] [--plain|--json]",
  show: "usage: repo-journal show <slug> [--full] [--plain|--json]",
  path: "usage: repo-journal path [--plain|--json]",
  root: "usage: repo-journal root [--plain|--json]",
  doctor: "usage: repo-journal doctor [--plain|--json]",
  "ensure-gitignore":
    "usage: repo-journal ensure-gitignore [--plain|--json]",
};
