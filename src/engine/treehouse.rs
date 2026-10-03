use std::collections::BTreeSet;
use std::path::{Path, PathBuf};
use std::process::Command;

use serde_json::Value;

use crate::error::{CliError, Result};
use crate::git::{git_status, resolve_repo_root, GitStatus};

pub const ENGINE: &str = "treehouse";
const INSTALL_HINT: &str = "install treehouse: curl -fsSL https://kunchenguid.github.io/treehouse/install.sh | sh";

#[derive(Debug, Clone)]
pub struct ResolvedRoots {
    pub active_root: PathBuf,
    pub journal_root: PathBuf,
    pub worktree_roots: Vec<PathBuf>,
}

#[derive(Debug, Clone, Default, serde::Serialize)]
pub struct PoolSummary {
    pub slots: usize,
    pub leased: usize,
    pub in_use: usize,
    pub available: usize,
}

pub fn require_treehouse() -> Result<()> {
    if treehouse_available() {
        return Ok(());
    }
    Err(
        CliError::new(
            "TREEHOUSE_REQUIRED",
            "repo-journal requires treehouse on PATH",
        )
        .with_suggestions(vec![INSTALL_HINT, "https://github.com/kunchenguid/treehouse"]),
    )
}

pub fn treehouse_available() -> bool {
    Command::new("treehouse")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn treehouse_version() -> Option<String> {
    let output = Command::new("treehouse").arg("--version").output().ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if text.is_empty() {
        String::from_utf8_lossy(&output.stderr).trim().to_string().into()
    } else {
        Some(text)
    }
}

fn run_treehouse(cwd: &Path, args: &[&str]) -> Result<String> {
    require_treehouse()?;
    let output = Command::new("treehouse")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| CliError::new("UNKNOWN", format!("failed to run treehouse: {e}")))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(CliError::new(
            "TREEHOUSE_ERROR",
            if stderr.is_empty() {
                format!("treehouse {} failed", args.join(" "))
            } else {
                stderr
            },
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Pool slots for the current repository (`treehouse status --json`).
pub fn pool_status(cwd: &Path) -> Result<Value> {
    let out = run_treehouse(cwd, &["status", "--json"])?;
    serde_json::from_str(out.trim()).map_err(|e| {
        CliError::new(
            "TREEHOUSE_ERROR",
            format!("invalid treehouse status JSON: {e}"),
        )
    })
}

pub fn summarize_pool(value: &Value) -> PoolSummary {
    let Some(slots) = value.as_array() else {
        return PoolSummary::default();
    };
    let mut summary = PoolSummary {
        slots: slots.len(),
        ..Default::default()
    };
    for slot in slots {
        let status = slot
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        match status {
            "leased" => summary.leased += 1,
            "in-use" | "in_use" => summary.in_use += 1,
            "available" => summary.available += 1,
            _ => {}
        }
    }
    summary
}

fn pool_worktree_paths(status: &Value) -> Vec<PathBuf> {
    let Some(slots) = status.as_array() else {
        return Vec::new();
    };
    slots
        .iter()
        .filter_map(|slot| slot.get("path").and_then(|v| v.as_str()))
        .map(PathBuf::from)
        .collect()
}

/// Main checkout path (Treehouse seeds gitignored files from here).
fn main_worktree_root(cwd: &Path) -> Result<PathBuf> {
    let output = Command::new("git")
        .args(["worktree", "list", "--porcelain"])
        .current_dir(cwd)
        .output()
        .map_err(|e| CliError::new("UNKNOWN", format!("failed to run git: {e}")))?;
    if !output.status.success() {
        return resolve_repo_root(cwd);
    }
    let text = String::from_utf8_lossy(&output.stdout);
    for line in text.lines() {
        if let Some(path) = line.strip_prefix("worktree ") {
            return Ok(PathBuf::from(path));
        }
    }
    resolve_repo_root(cwd)
}

pub fn resolve_roots(cwd: &Path) -> Result<ResolvedRoots> {
    require_treehouse()?;
    let active_root = resolve_repo_root(cwd)?;
    let journal_root = main_worktree_root(cwd)?;
    let status = pool_status(cwd).unwrap_or(Value::Array(Vec::new()));

    let mut seen = BTreeSet::new();
    let mut worktree_roots = Vec::new();
    for root in [journal_root.clone(), active_root.clone()]
        .into_iter()
        .chain(pool_worktree_paths(&status))
    {
        if seen.insert(root.clone()) {
            worktree_roots.push(root);
        }
    }

    Ok(ResolvedRoots {
        active_root,
        journal_root,
        worktree_roots,
    })
}

pub fn git_status_for_journal(journal_root: &Path) -> GitStatus {
    git_status(journal_root)
}
