export declare function slugify(raw: string): string;
export type JournalEntryMeta = {
    slug: string;
    date: string;
    title: string;
    basename: string;
    path: string;
};
export declare function ensureJournalDir(journalDir: string): void;
export declare function listEntryFiles(journalDir: string): string[];
export declare function listEntries(journalDir: string): JournalEntryMeta[];
export declare function latestForSlug(journalDir: string, slug: string): string | undefined;
export declare function requireSlug(raw: string): string;
export declare function todayIso(): string;
export declare function nowTime(): string;
export declare function nowStamp(): string;
export declare function cmdNew(journalDir: string, slugRaw: string, titleWords: string[]): {
    path: string;
    created: boolean;
    slug: string;
};
export declare function cmdAdd(journalDir: string, slugRaw: string, noteParts: string[]): {
    path: string;
    slug: string;
};
export declare function readEntryContent(path: string, full: boolean): {
    content: string;
    truncated: boolean;
};
