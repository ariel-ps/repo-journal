import { join } from "node:path";
import { resolveRepoRoot } from "./git.js";

export type JournalContext = {
  repoRoot: string;
  journalDir: string;
  cwd: string;
};

/** Host pane cwd when the tool is installed as a Herdr plugin (standard host env). */
export function resolveActionCwd(
  raw = process.env.HERDR_PLUGIN_CONTEXT_JSON,
  fallback = process.cwd(),
): string {
  if (!raw) return fallback;
  try {
    const context = JSON.parse(raw) as Record<string, unknown>;
    for (const key of ["focused_pane_cwd", "workspace_cwd"]) {
      const value = context[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  } catch {
    // Direct CLI use and malformed host context both fall back to the caller.
  }
  return fallback;
}

export function resolveJournalContext(cwd = resolveActionCwd()): JournalContext {
  const repoRoot = resolveRepoRoot(cwd);
  return {
    repoRoot,
    journalDir: join(repoRoot, ".journal"),
    cwd,
  };
}
