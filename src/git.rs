use std::path::Path;
use std::process::Command;

use crate::error::{CliError, Result};

fn git(args: &[&str], cwd: &Path) -> Result<String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .map_err(|e| CliError::new("UNKNOWN", format!("failed to run git: {e}")))?;
    if !output.status.success() {
        return Err(
            CliError::new(
                "NOT_GIT_REPO",
                "journal-repo requires a git work tree",
            )
            .with_suggestions(vec![
                "cd into a clone",
                "run git init for a new project",
            ]),
        );
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn git_or(args: &[&str], cwd: &Path, fallback: &str) -> String {
    Command::new("git")
        .args(args)
        .current_dir(cwd)
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| fallback.to_string())
}

pub fn resolve_repo_root(cwd: &Path) -> Result<std::path::PathBuf> {
    let root = git(&["rev-parse", "--show-toplevel"], cwd)?;
    Ok(Path::new(&root).to_path_buf())
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct GitStatus {
    pub branch: String,
    pub head: String,
    pub dirty: bool,
}

pub fn git_status(repo_root: &Path) -> GitStatus {
    GitStatus {
        branch: git_or(&["symbolic-ref", "--short", "HEAD"], repo_root, "HEAD"),
        head: git_or(&["rev-parse", "--short", "HEAD"], repo_root, "unborn"),
        dirty: !git_or(&["status", "--porcelain"], repo_root, "").is_empty(),
    }
}

pub fn list_tracked_journal_files(repo_root: &Path) -> Vec<String> {
    Command::new("git")
        .args(["ls-files", "--", ".journal"])
        .current_dir(repo_root)
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
        .map(|out| out.lines().filter(|l| !l.is_empty()).map(str::to_string).collect())
        .unwrap_or_default()
}
