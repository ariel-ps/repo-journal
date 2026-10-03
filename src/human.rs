use std::io::IsTerminal;
use std::path::Path;

use crate::git::GitStatus;
use crate::journal::JournalEntryMeta;
use crate::output::collapse_home;
use crate::VERSION;

pub struct Style {
    color: bool,
}

impl Style {
    pub fn detect() -> Self {
        Self {
            color: std::io::stdout().is_terminal(),
        }
    }

    fn green(&self, text: &str) -> String {
        if self.color {
            format!("\x1b[32m{text}\x1b[0m")
        } else {
            text.to_string()
        }
    }

    fn dim(&self, text: &str) -> String {
        if self.color {
            format!("\x1b[2m{text}\x1b[0m")
        } else {
            text.to_string()
        }
    }

    fn bold(&self, text: &str) -> String {
        if self.color {
            format!("\x1b[1m{text}\x1b[0m")
        } else {
            text.to_string()
        }
    }
}

pub fn format_help() -> String {
    format!(
        r#"{} — git-root investigation scratch (.journal/)

{}
  repo-journal [command] [args] [flags]

{}
  dashboard              Repo summary and recent entries (default)
  new <slug> [title...]  Create or reuse today's entry for slug
  add <slug> <note...>   Append a finding to an entry
  list                   List recent entries
  show <slug>            Show entry contents
  path                   Print .journal directory path
  root                   Print git repository root
  doctor                 Check gitignore and git policy
  ensure-gitignore       Append /.journal/ to .gitignore
  complete slugs         Slug list for shell tab completion

{}
  --plain    Scripting: paths or raw text only
  --json     Machine-readable JSON
  --toon     TOON encoding for agents
  -h, --help
  -V, --version

{}
  repo-journal
  repo-journal new auth-timeout "Why login times out"
  repo-journal add auth-timeout "repro at 40 logins"
  repo-journal list
  repo-journal show auth-timeout --full
  repo-journal doctor

Shell
  source completions/repo-journal.zsh   # zsh (also via plugin shell.zsh)
  source completions/repo-journal.bash  # bash (also via plugin shell.bash)
"#,
        Style::detect().bold("repo-journal"),
        Style::detect().bold("Usage"),
        Style::detect().bold("Commands"),
        Style::detect().bold("Flags"),
        Style::detect().bold("Examples"),
    )
}

fn display_path(path: &Path) -> String {
    collapse_home(path)
}

pub fn format_dashboard(
    style: &Style,
    repo_root: &Path,
    journal_dir: &Path,
    git: &GitStatus,
    gitignore_ok: bool,
    entries: &[JournalEntryMeta],
    recent: &[JournalEntryMeta],
    ensure_gitignore: bool,
) -> String {
    let mut out = String::new();
    out.push_str(&format!("{} {}\n\n", style.bold("Repo Journal"), VERSION));
    out.push_str(&format!(
        "  {:<10} {}\n",
        style.dim("Repository"),
        display_path(repo_root)
    ));
    out.push_str(&format!(
        "  {:<10} {}\n\n",
        style.dim("Journal"),
        display_path(journal_dir)
    ));

    let dirty = if git.dirty { "dirty" } else { "clean" };
    let ignore = if gitignore_ok { "ok" } else { "missing" };
    out.push_str(&format!(
        "  {:<10} {} @ {} ({}, gitignore {})\n\n",
        style.dim("Git"),
        git.branch,
        git.head,
        dirty,
        ignore
    ));
    if !ensure_gitignore {
        out.push_str(&format!("  {}\n\n", style.dim("Note: REPO_JOURNAL_ENSURE_GITIGNORE=0")));
    }

    if entries.is_empty() {
        out.push_str(&format!("{}\n\n", style.dim("No journal entries yet.")));
        out.push_str(&format!(
            "  {}\n",
            style.dim("Try: repo-journal new <slug> \"<title>\"")
        ));
        return out;
    }

    out.push_str(&format!(
        "{} ({} total)\n",
        style.bold("Recent entries"),
        entries.len()
    ));
    out.push_str(&format!(
        "  {:<22} {:<12} {}\n",
        style.dim("SLUG"),
        style.dim("DATE"),
        style.dim("TITLE")
    ));
    for e in recent {
        let title = if e.title.len() > 48 {
            format!("{}…", &e.title[..47])
        } else {
            e.title.clone()
        };
        out.push_str(&format!("  {:<22} {:<12} {}\n", e.slug, e.date, title));
    }
    if entries.len() > recent.len() {
        out.push_str(&format!(
            "\n  {}\n",
            style.dim("… use repo-journal list --all for more")
        ));
    }
    if let Some(first) = recent.first() {
        out.push_str(&format!(
            "\n  {}\n",
            style.dim(&format!("Try: repo-journal show {}", first.slug))
        ));
    }
    out
}

pub fn format_list(entries: &[JournalEntryMeta], truncated: bool) -> String {
    let style = Style::detect();
    if entries.is_empty() {
        return format!(
            "{}\n\n  {}\n",
            style.dim("No journal entries."),
            style.dim("Try: repo-journal new <slug> \"<title>\"")
        );
    }
    let mut out = format!("{}\n", style.bold("Journal entries"));
    out.push_str(&format!(
        "  {:<22} {:<12} {}\n",
        style.dim("SLUG"),
        style.dim("DATE"),
        style.dim("TITLE")
    ));
    for e in entries {
        out.push_str(&format!("  {:<22} {:<12} {}\n", e.slug, e.date, e.title));
    }
    if truncated {
        out.push_str(&format!(
            "\n  {}\n",
            style.dim("… truncated; use --all to show everything")
        ));
    }
    out
}

pub fn format_new(
    path: &str,
    slug: &str,
    created: bool,
    gitignore: &str,
) -> String {
    let style = Style::detect();
    let verb = if created { "Created" } else { "Reusing" };
    let mut out = format!("{} {}\n", style.green(&format!("✓ {verb}")), path);
    out.push_str(&format!("  slug: {}\n", slug));
    if gitignore != "ok" {
        out.push_str(&format!("  gitignore: {gitignore}\n"));
    }
    out.push_str(&format!(
        "\n  {}\n  {}\n",
        style.dim(&format!("Next: repo-journal add {slug} \"<finding>\"")),
        style.dim(&format!("      repo-journal show {slug}")),
    ));
    out
}

pub fn format_add(path: &str, slug: &str) -> String {
    let style = Style::detect();
    format!(
        "{}\n  slug: {}\n\n  {}\n",
        style.green(&format!("✓ Appended to {path}")),
        slug,
        style.dim(&format!("Try: repo-journal show {slug}")),
    )
}

pub fn format_show(slug: &str, path: &str, content: &str, truncated: bool) -> String {
    let style = Style::detect();
    let mut out = format!("{}  {}\n", style.bold(slug), style.dim(path));
    out.push_str(&format!("{}\n\n", "─".repeat(40)));
    out.push_str(content);
    if !content.ends_with('\n') {
        out.push('\n');
    }
    if truncated {
        out.push_str(&format!(
            "\n{}\n",
            style.dim("… truncated; use --full for entire entry")
        ));
    }
    out
}

pub fn format_doctor(
    ok: bool,
    repo_root: &Path,
    journal_dir: &Path,
    gitignore_ok: bool,
    tracked: usize,
    issues: &[&str],
) -> String {
    let style = Style::detect();
    let head = if ok {
        style.green("✓ Doctor: all checks passed")
    } else {
        "✗ Doctor: issues found".to_string()
    };
    let mut out = format!("{head}\n\n");
    out.push_str(&format!(
        "  repository: {}\n  journal:    {}\n",
        display_path(repo_root),
        display_path(journal_dir)
    ));
    out.push_str(&format!(
        "  gitignore:  {}\n  tracked .journal files: {}\n",
        if gitignore_ok { "ok" } else { "missing" },
        tracked
    ));
    if !issues.is_empty() {
        out.push_str("\n  issues:\n");
        for issue in issues {
            out.push_str(&format!("    - {issue}\n"));
        }
        out.push('\n');
        if !gitignore_ok {
            out.push_str(&format!("  {}\n", style.dim("Fix: repo-journal ensure-gitignore")));
        }
        if tracked > 0 {
            out.push_str(&format!(
                "  {}\n",
                style.dim("Fix: git rm -r --cached .journal/  (if you mean to ignore it)")
            ));
        }
    }
    out
}

pub fn format_simple_ok(message: &str) -> String {
    format!("{}\n", Style::detect().green(&format!("✓ {message}")))
}

pub fn format_path_label(label: &str, path: &Path) -> String {
    format!("{label}: {}\n", display_path(path))
}
