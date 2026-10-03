import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ensureJournalGitignore,
  journalIgnoredInGitignore,
} from "../src/gitignore.js";
import { resolveActionCwd } from "../src/context.js";
import { newCommand, showCommand } from "../src/commands.js";
import { gitStatus } from "../src/git.js";
import {
  cmdAdd,
  cmdNew,
  listEntries,
  slugify,
  todayIso,
} from "../src/journal.js";

describe("slugify", () => {
  it("normalizes slugs", () => {
    expect(slugify("Auth Timeout!")).toBe("auth-timeout");
  });
});

describe("gitignore", () => {
  it("appends .journal/ when missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "hj-"));
    try {
      expect(journalIgnoredInGitignore(dir)).toBe(false);
      expect(ensureJournalGitignore(dir)).toBe("appended");
      expect(journalIgnoredInGitignore(dir)).toBe(true);
      expect(readFileSync(join(dir, ".gitignore"), "utf8")).toContain("/.journal/");
      expect(ensureJournalGitignore(dir)).toBe("ok");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses a symlinked .gitignore", () => {
    const dir = mkdtempSync(join(tmpdir(), "hj-ignore-link-"));
    const outside = join(dir, "outside");
    writeFileSync(outside, "preserved\n");
    symlinkSync(outside, join(dir, ".gitignore"));
    try {
      expect(() => ensureJournalGitignore(dir)).toThrow(/regular file|unsafe/);
      expect(readFileSync(outside, "utf8")).toBe("preserved\n");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("repairs a later negation of the journal rule", () => {
    const dir = mkdtempSync(join(tmpdir(), "hj-ignore-negation-"));
    try {
      writeFileSync(join(dir, ".gitignore"), "/.journal/\n!/.journal/\n");
      expect(journalIgnoredInGitignore(dir)).toBe(false);
      expect(ensureJournalGitignore(dir)).toBe("appended");
      expect(journalIgnoredInGitignore(dir)).toBe(true);
      expect(readFileSync(join(dir, ".gitignore"), "utf8")).toMatch(
        /!\/\.journal\/\n# Repo Journal[\s\S]*\/\.journal\/\n$/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("cmdNew", () => {
  it("is idempotent for same day and slug", () => {
    const dir = mkdtempSync(join(tmpdir(), "hj-j-"));
    try {
      const first = cmdNew(dir, "auth-timeout", ["Title"]);
      const second = cmdNew(dir, "auth-timeout", ["Other"]);
      expect(second.path).toBe(first.path);
      expect(second.created).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects an empty normalized slug", () => {
    const dir = mkdtempSync(join(tmpdir(), "hj-empty-"));
    try {
      expect(() => cmdNew(dir, "!!!", [])).toThrow(/letter or digit/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("matches exact slugs when appending", () => {
    const dir = mkdtempSync(join(tmpdir(), "hj-exact-"));
    try {
      cmdNew(dir, "auth-timeout", ["Auth"]);
      cmdAdd(dir, "timeout", ["Timeout"]);
      expect(listEntries(dir).map((entry) => entry.slug).sort()).toEqual([
        "auth-timeout",
        "timeout",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("refuses symlinks for the journal directory and entries", () => {
    const dir = mkdtempSync(join(tmpdir(), "hj-links-"));
    const repo = join(dir, "repo");
    const outside = join(dir, "outside");
    mkdirSync(repo);
    mkdirSync(outside);
    symlinkSync(outside, join(repo, ".journal"), "dir");
    try {
      expect(() => cmdNew(join(repo, ".journal"), "escape", [])).toThrow(
        /real directory|safely use/,
      );
      expect(readdirSync(outside)).toEqual([]);
      rmSync(join(repo, ".journal"));
      mkdirSync(join(repo, ".journal"));
      const outsideFile = join(outside, "entry.md");
      writeFileSync(outsideFile, "preserved\n");
      symlinkSync(
        outsideFile,
        join(repo, ".journal", `${todayIso()}-escape.md`),
      );
      expect(() => cmdAdd(join(repo, ".journal"), "escape", ["note"])).toThrow(
        /unsafe journal path/,
      );
      expect(readFileSync(outsideFile, "utf8")).toBe("preserved\n");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("resolveActionCwd", () => {
  it("prefers focused pane then workspace context", () => {
    expect(
      resolveActionCwd(
        JSON.stringify({
          focused_pane_cwd: "/pane",
          workspace_cwd: "/workspace",
        }),
        "/fallback",
      ),
    ).toBe("/pane");
    expect(
      resolveActionCwd(
        JSON.stringify({ workspace_cwd: "/workspace" }),
        "/fallback",
      ),
    ).toBe("/workspace");
    expect(resolveActionCwd("invalid", "/fallback")).toBe("/fallback");
  });
});

describe("command slug validation", () => {
  it("rejects empty slugs before changing repository policy", async () => {
    const dir = mkdtempSync(join(tmpdir(), "hj-command-"));
    const context = {
      repoRoot: dir,
      journalDir: join(dir, ".journal"),
      cwd: dir,
    };
    try {
      await expect(newCommand(["!!!"], context)).rejects.toThrow(/letter or digit/);
      await expect(showCommand(["!!!"], context)).rejects.toThrow(/letter or digit/);
      expect(existsSync(join(dir, ".gitignore"))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("gitStatus", () => {
  it("supports a repository before its first commit", () => {
    const dir = mkdtempSync(join(tmpdir(), "hj-git-"));
    try {
      execFileSync("git", ["init", "-q"], { cwd: dir });
      expect(gitStatus(dir)).toMatchObject({ head: "unborn", dirty: false });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
