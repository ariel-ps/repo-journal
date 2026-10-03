export declare const GITIGNORE_BLOCK = "# Repo Journal \u2014 local investigation scratch (repo-journal)\n/.journal/\n";
export declare function journalIgnoredInGitignore(repoRoot: string): boolean;
export declare function ensureJournalGitignore(repoRoot: string): "ok" | "appended";
