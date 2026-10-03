import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
  appendFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { AxiError } from "axi-sdk-js";

export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type JournalEntryMeta = {
  slug: string;
  date: string;
  title: string;
  basename: string;
  path: string;
};

function parseBasename(name: string): { date: string; slug: string } | null {
  const m = /^(\d{4}-\d{2}-\d{2})-(.+)\.md$/.exec(name);
  if (!m) return null;
  return { date: m[1], slug: m[2] };
}

function readTitle(filePath: string): string {
  const first = readRegularFile(filePath).split("\n")[0] ?? "";
  const title = first.replace(/^#\s*/, "").trim();
  return title || "untitled";
}

function unsafePath(message: string): AxiError {
  return new AxiError(message, "UNSAFE_PATH");
}

function readRegularFile(path: string): string {
  let descriptor: number;
  try {
    descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch {
    throw unsafePath(`refusing to read unsafe journal path: ${path}`);
  }
  try {
    if (!fstatSync(descriptor).isFile()) {
      throw unsafePath(`journal entry is not a regular file: ${path}`);
    }
    return readFileSync(descriptor, "utf8");
  } finally {
    closeSync(descriptor);
  }
}

function appendRegularFile(path: string, text: string): void {
  let descriptor: number;
  try {
    descriptor = openSync(
      path,
      constants.O_WRONLY | constants.O_APPEND | constants.O_NOFOLLOW,
    );
  } catch {
    throw unsafePath(`refusing to write unsafe journal path: ${path}`);
  }
  try {
    if (!fstatSync(descriptor).isFile()) {
      throw unsafePath(`journal entry is not a regular file: ${path}`);
    }
    appendFileSync(descriptor, text, "utf8");
  } finally {
    closeSync(descriptor);
  }
}

function createRegularFile(path: string, text: string): boolean {
  let descriptor: number;
  try {
    descriptor = openSync(
      path,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600,
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "EEXIST"
    ) {
      readRegularFile(path);
      return false;
    }
    throw unsafePath(`refusing to create unsafe journal path: ${path}`);
  }
  try {
    writeFileSync(descriptor, text, "utf8");
  } finally {
    closeSync(descriptor);
  }
  return true;
}

export function ensureJournalDir(journalDir: string): void {
  try {
    mkdirSync(journalDir, { recursive: true });
    const info = lstatSync(journalDir);
    if (
      info.isSymbolicLink() ||
      !info.isDirectory() ||
      realpathSync(journalDir) !==
        join(realpathSync(dirname(journalDir)), basename(journalDir))
    ) {
      throw unsafePath(`journal directory must be a real directory: ${journalDir}`);
    }
  } catch (error) {
    if (error instanceof AxiError) throw error;
    throw unsafePath(`cannot safely use journal directory: ${journalDir}`);
  }
}

export function listEntryFiles(journalDir: string): string[] {
  try {
    const info = lstatSync(journalDir);
    if (info.isSymbolicLink() || !info.isDirectory()) {
      throw unsafePath(`journal directory must be a real directory: ${journalDir}`);
    }
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return [];
    }
    if (error instanceof AxiError) throw error;
    throw unsafePath(`cannot safely read journal directory: ${journalDir}`);
  }
  return readdirSync(journalDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name)
    .sort()
    .reverse()
    .map((f) => join(journalDir, f));
}

export function listEntries(journalDir: string): JournalEntryMeta[] {
  return listEntryFiles(journalDir).flatMap((path) => {
    const base = basename(path);
    const parsed = parseBasename(base);
    if (!parsed) return [];
    return [
      {
        slug: parsed.slug,
        date: parsed.date,
        title: readTitle(path),
        basename: base.replace(/\.md$/, ""),
        path,
      },
    ];
  });
}

export function latestForSlug(
  journalDir: string,
  slug: string,
): string | undefined {
  const files = listEntryFiles(journalDir).filter((path) => {
    const parsed = parseBasename(basename(path));
    return parsed?.slug === slug;
  });
  return files[0];
}

export function requireSlug(raw: string): string {
  const slug = slugify(raw);
  if (!slug) {
    throw new AxiError(
      "slug must contain at least one letter or digit",
      "VALIDATION_ERROR",
    );
  }
  return slug;
}

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nowTime(): string {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

export function nowStamp(): string {
  const d = new Date();
  return `${todayIso()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function cmdNew(
  journalDir: string,
  slugRaw: string,
  titleWords: string[],
): { path: string; created: boolean; slug: string } {
  const slug = requireSlug(slugRaw);
  ensureJournalDir(journalDir);
  const date = todayIso();
  const file = join(journalDir, `${date}-${slug}.md`);
  const title = titleWords.length > 0 ? titleWords.join(" ") : slugRaw;
  const body = `# ${title}\n\n_Investigation started ${nowStamp()}_\n\n## Findings\n`;
  if (!createRegularFile(file, body)) {
    return { path: file, created: false, slug };
  }
  return { path: file, created: true, slug };
}

export function cmdAdd(
  journalDir: string,
  slugRaw: string,
  noteParts: string[],
): { path: string; slug: string } {
  const slug = requireSlug(slugRaw);
  ensureJournalDir(journalDir);
  let file = latestForSlug(journalDir, slug);
  if (!file) {
    const created = cmdNew(journalDir, slugRaw, [slugRaw]);
    file = created.path;
  }
  const note = noteParts.join(" ");
  ensureJournalDir(journalDir);
  appendRegularFile(file, `- **${nowTime()}** ${note}\n`);
  return { path: file, slug };
}

export function readEntryContent(path: string, full: boolean): {
  content: string;
  truncated: boolean;
} {
  const content = readRegularFile(path);
  if (full) return { content, truncated: false };
  const maxChars = 4000;
  if (content.length <= maxChars) return { content, truncated: false };
  return {
    content: `${content.slice(0, maxChars)}\n\n… (${content.length - maxChars} more chars; use --full)\n`,
    truncated: true,
  };
}
