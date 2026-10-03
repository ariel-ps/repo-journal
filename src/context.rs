use std::path::{Path, PathBuf};

use crate::engine::{resolve_roots, treehouse_version};
use crate::error::{CliError, Result};

#[derive(Debug, Clone)]
pub struct JournalContext {
    /// Main checkout where `.journal/` lives (Treehouse seed source).
    pub repo_root: PathBuf,
    /// Worktree the user or agent is operating in (may be a Treehouse pool slot).
    pub active_root: PathBuf,
    pub journal_dir: PathBuf,
    pub cwd: PathBuf,
    pub worktree_roots: Vec<PathBuf>,
    pub treehouse_version: Option<String>,
}

pub fn resolve_action_cwd(raw: Option<&str>, fallback: &Path) -> PathBuf {
    let Some(raw) = raw else {
        return fallback.to_path_buf();
    };
    let Ok(context) = serde_json::from_str::<serde_json::Value>(raw) else {
        return fallback.to_path_buf();
    };
    for key in ["focused_pane_cwd", "workspace_cwd"] {
        if let Some(value) = context.get(key).and_then(|v| v.as_str()) {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return PathBuf::from(trimmed);
            }
        }
    }
    fallback.to_path_buf()
}

pub fn resolve_journal_context(cwd: &Path) -> Result<JournalContext> {
    let roots = resolve_roots(cwd)?;
    Ok(JournalContext {
        journal_dir: roots.journal_root.join(".journal"),
        repo_root: roots.journal_root,
        active_root: roots.active_root,
        worktree_roots: roots.worktree_roots,
        cwd: cwd.to_path_buf(),
        treehouse_version: treehouse_version(),
    })
}

pub fn journal_context_from_env() -> Result<JournalContext> {
    let fallback = std::env::current_dir().map_err(|e| {
        CliError::new("UNKNOWN", format!("cannot read current directory: {e}"))
    })?;
    let cwd = resolve_action_cwd(
        std::env::var("HERDR_PLUGIN_CONTEXT_JSON")
            .ok()
            .as_deref(),
        &fallback,
    );
    resolve_journal_context(&cwd)
}
