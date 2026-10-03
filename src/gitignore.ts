import {
  appendFileSync,
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import { AxiError } from "axi-sdk-js";

export const GITIGNORE_BLOCK = `# Repo Journal — local investigation scratch (repo-journal)
/.journal/
`;

function journalRuleIsEffective(text: string): boolean {
  let ignored = false;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const match = /^(!?)\/?\.journal\/?$/.exec(line);
    if (match) ignored = match[1] !== "!";
  }
  return ignored;
}

function readGitignore(path: string): string | null {
  try {
    const info = lstatSync(path);
    if (info.isSymbolicLink() || !info.isFile()) {
      throw new AxiError(
        `.gitignore must be a regular file: ${path}`,
        "UNSAFE_PATH",
      );
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
  let descriptor: number;
  try {
    descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch {
    throw new AxiError(`refusing to read unsafe path: ${path}`, "UNSAFE_PATH");
  }
  try {
    if (!fstatSync(descriptor).isFile()) {
      throw new AxiError(`.gitignore must be a regular file: ${path}`, "UNSAFE_PATH");
    }
    return readFileSync(descriptor, "utf8");
  } finally {
    closeSync(descriptor);
  }
}

export function journalIgnoredInGitignore(repoRoot: string): boolean {
  const path = join(repoRoot, ".gitignore");
  const text = readGitignore(path);
  return text !== null && journalRuleIsEffective(text);
}

export function ensureJournalGitignore(repoRoot: string): "ok" | "appended" {
  const path = join(repoRoot, ".gitignore");
  const text = readGitignore(path);
  if (text !== null && journalRuleIsEffective(text)) {
    return "ok";
  }
  const sep = text === null || text.endsWith("\n") || text.length === 0 ? "" : "\n";
  let descriptor: number;
  try {
    const createFlags =
      text === null ? constants.O_CREAT | constants.O_EXCL : constants.O_APPEND;
    descriptor = openSync(
      path,
      constants.O_WRONLY | constants.O_NOFOLLOW | createFlags,
      0o644,
    );
  } catch {
    throw new AxiError(`refusing to write unsafe path: ${path}`, "UNSAFE_PATH");
  }
  try {
    if (!fstatSync(descriptor).isFile()) {
      throw new AxiError(`.gitignore must be a regular file: ${path}`, "UNSAFE_PATH");
    }
    appendFileSync(descriptor, `${sep}${GITIGNORE_BLOCK}`, "utf8");
  } finally {
    closeSync(descriptor);
  }
  return "appended";
}
