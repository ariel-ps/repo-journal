import { execFileSync } from "node:child_process";
import { AxiError } from "axi-sdk-js";

function git(args: string[], cwd: string): string {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new AxiError(
      "repo-journal requires a git work tree",
      "NOT_GIT_REPO",
      ["cd into a clone", "run git init for a new project"],
    );
  }
}

function gitOr(args: string[], cwd: string, fallback: string): string {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return fallback;
  }
}

export function resolveRepoRoot(cwd = process.cwd()): string {
  return git(["rev-parse", "--show-toplevel"], cwd);
}

export function gitStatus(repoRoot: string): {
  branch: string;
  head: string;
  dirty: boolean;
} {
  const branch = gitOr(["symbolic-ref", "--short", "HEAD"], repoRoot, "HEAD");
  const head = gitOr(["rev-parse", "--short", "HEAD"], repoRoot, "unborn");
  const dirty = gitOr(["status", "--porcelain"], repoRoot, "").length > 0;
  return { branch, head, dirty };
}

export function listTrackedJournalFiles(repoRoot: string): string[] {
  try {
    const out = execFileSync("git", ["ls-files", "--", ".journal"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    if (!out) return [];
    return out.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}
