export declare function resolveRepoRoot(cwd?: string): string;
export declare function gitStatus(repoRoot: string): {
    branch: string;
    head: string;
    dirty: boolean;
};
export declare function listTrackedJournalFiles(repoRoot: string): string[];
