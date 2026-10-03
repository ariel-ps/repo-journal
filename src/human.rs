use std::io::IsTerminal;
use std::path::Path;

use crate::treehouse::PoolSummary;
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
  journal-repo [command] [args] [flags]

{}
  dashboard              Repo summary and recent entries (default)
  new <slug> [title...]  Create or reuse today's entry for slug
  add <slug> <note...>   Append a finding to an entry
  attach <slug> <path…>  Copy repo files or folders into the entry bundle
  files <slug>           List attached artifact paths
  list                   List recent entries
  show <slug>            Show entry contents
  path                   Print .journal directory path
  root                   Print git repository root
  doctor                 Check gitignore and git policy
  ensure-gitignore       Append /.journal/ to .gitignore
  complete slugs         Slug list for shell tab completion
  treehouse              Show Treehouse version, roots, and pool

{}
  --plain    Scripting: paths or raw text only
  --json     Machine-readable JSON
  --toon     TOON encoding for agents
  -h, --help
  -V, --version

{}
  journal-repo
  journal-repo new auth-timeout "Why login times out"
  journal-repo add auth-timeout "repro at 40 logins"
  journal-repo list
  journal-repo show auth-timeout --full
  journal-repo attach auth-timeout logs/error.txt
  journal-repo files auth-timeout
  journal-repo doctor

Requires [Treehouse](https://github.com/kunchenguid/treehouse) on PATH (only supported worktree backend). Journal lives on the main checkout; pool status from `treehouse status --json`. `engine` is a deprecated alias for `treehouse`.

Shell
  source completions/journal-repo.zsh   # zsh (also via plugin shell.zsh)
  source completions/journal-repo.bash  # bash (also via plugin shell.bash)
"#,
        Style::detect().bold("journal-repo"),
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
    treehouse_version: Option<&str>,
    active_root: &Path,
    journal_root: &Path,
    journal_dir: &Path,
    git: &GitStatus,
    gitignore_ok: bool,
    pool: &PoolSummary,
    entries: &[JournalEntryMeta],
    recent: &[JournalEntryMeta],
    ensure_gitignore: bool,
) -> String {
    let mut out = String::new();
    out.push_str(&format!("{} {}\n\n", style.bold("Journal Repo"), VERSION));
    let treehouse_line = match treehouse_version {
        Some(v) => format!("treehouse {v}"),
        None => "treehouse (version unknown)".to_string(),
    };
    out.push_str(&format!(
        "  {:<10} {}\n",
        style.dim("Treehouse"),
        treehouse_line
    ));
    if active_root != journal_root {
        out.push_str(&format!(
            "  {:<10} {}\n",
            style.dim("Active"),
            display_path(active_root)
        ));
    }
    out.push_str(&format!(
        "  {:<10} {}\n",
        style.dim("Journal root"),
        display_path(journal_root)
    ));
    out.push_str(&format!(
        "  {:<10} {}\n\n",
        style.dim("Journal"),
        display_path(journal_dir)
    ));
    if pool.slots > 0 {
        out.push_str(&format!(
            "  {:<10} {} slots ({} available, {} leased, {} in-use)\n\n",
            style.dim("Pool"),
            pool.slots,
            pool.available,
            pool.leased,
            pool.in_use
        ));
    }

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
        out.push_str(&format!(
            "  {}\n\n",
            style.dim("Note: JOURNAL_REPO_ENSURE_GITIGNORE=0 (legacy REPO_JOURNAL_ENSURE_GITIGNORE=0)")
        ));
    }

    if entries.is_empty() {
        out.push_str(&format!("{}\n\n", style.dim("No journal entries yet.")));
        out.push_str(&format!(
            "  {}\n",
            style.dim("Try: journal-repo new <slug> \"<title>\"")
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
        let mut title = if e.title.len() > 40 {
            format!("{}…", &e.title[..39])
        } else {
            e.title.clone()
        };
        if e.attachments > 0 {
            title.push_str(&format!(" (+{} files)", e.attachments));
        }
        out.push_str(&format!("  {:<22} {:<12} {}\n", e.slug, e.date, title));
    }
    if entries.len() > recent.len() {
        out.push_str(&format!(
            "\n  {}\n",
            style.dim("… use journal-repo list --all for more")
        ));
    }
    if let Some(first) = recent.first() {
        out.push_str(&format!(
            "\n  {}\n",
            style.dim(&format!("Try: journal-repo show {}", first.slug))
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
            style.dim("Try: journal-repo new <slug> \"<title>\"")
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
        let title = if e.attachments > 0 {
            format!("{} (+{} files)", e.title, e.attachments)
        } else {
            e.title.clone()
        };
        out.push_str(&format!("  {:<22} {:<12} {}\n", e.slug, e.date, title));
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
        style.dim(&format!("Next: journal-repo add {slug} \"<finding>\"")),
        style.dim(&format!("      journal-repo attach {slug} <path>")),
    ));
    out
}

pub fn format_add(path: &str, slug: &str) -> String {
    let style = Style::detect();
    format!(
        "{}\n  slug: {}\n\n  {}\n",
        style.green(&format!("✓ Appended to {path}")),
        slug,
        style.dim(&format!("Try: journal-repo show {slug}")),
    )
}

pub fn format_show(
    slug: &str,
    path: &str,
    content: &str,
    truncated: bool,
    attachments: &[String],
) -> String {
    let style = Style::detect();
    let mut out = format!("{}  {}\n", style.bold(slug), style.dim(path));
    out.push_str(&format!("{}\n\n", "─".repeat(40)));
    out.push_str(content);
    if !content.ends_with('\n') {
        out.push('\n');
    }
    if !attachments.is_empty() {
        out.push_str(&format!("\n{}\n", style.bold("Attachments")));
        for file in attachments {
            out.push_str(&format!("  {file}\n"));
        }
    }
    if truncated {
        out.push_str(&format!(
            "\n{}\n",
            style.dim("… truncated; use --full for entire entry")
        ));
    }
    out
}

pub fn format_attach(entry: &str, slug: &str, attached: &[crate::artifacts::AttachedItem]) -> String {
    let style = Style::detect();
    let mut out = format!(
        "{}\n  entry: {}\n  slug:  {}\n",
        style.green("✓ Attached"),
        entry,
        slug
    );
    for item in attached {
        out.push_str(&format!("  {} → {}\n", item.source, item.dest));
    }
    out.push_str(&format!(
        "\n  {}\n",
        style.dim(&format!("Try: journal-repo files {slug}"))
    ));
    out
}

pub fn format_files(slug: &str, bundle: &str, paths: &[String]) -> String {
    let style = Style::detect();
    if paths.is_empty() {
        return format!(
            "{}\n  bundle: {}\n\n  {}\n",
            style.bold(&format!("Files for {slug}")),
            bundle,
            style.dim("No attachments yet. Use: journal-repo attach <slug> <path>")
        );
    }
    let mut out = format!("{}\n  bundle: {}\n", style.bold(&format!("Files for {slug}")), bundle);
    for path in paths {
        out.push_str(&format!("  {path}\n"));
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
            out.push_str(&format!("  {}\n", style.dim("Fix: journal-repo ensure-gitignore")));
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

pub fn format_treehouse(
    treehouse_version: Option<&str>,
    active_root: &Path,
    journal_root: &Path,
    pool: &PoolSummary,
) -> String {
    let style = Style::detect();
    let mut out = format!("{}\n", style.bold("Treehouse"));
    out.push_str(&format!(
        "  version:      {}\n",
        treehouse_version
            .map(|v| v.to_string())
            .unwrap_or_else(|| "(unknown)".to_string())
    ));
    out.push_str(&format!(
        "  active root:  {}\n",
        display_path(active_root)
    ));
    out.push_str(&format!(
        "  journal root: {}\n",
        display_path(journal_root)
    ));
    if pool.slots > 0 {
        out.push_str(&format!(
            "  pool:         {} slots ({} available, {} leased, {} in-use)\n",
            pool.slots, pool.available, pool.leased, pool.in_use
        ));
    }
    out
}
