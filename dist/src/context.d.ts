export type JournalContext = {
    repoRoot: string;
    journalDir: string;
    cwd: string;
};
/** Host pane cwd when the tool is installed as a Herdr plugin (standard host env). */
export declare function resolveActionCwd(raw?: string | undefined, fallback?: string): string;
export declare function resolveJournalContext(cwd?: string): JournalContext;
