use std::fs;
use std::path::{Component, Path, PathBuf};

use crate::error::{CliError, Result};
use crate::journal::{append_bullet, ensure_journal_dir, latest_for_slug, require_slug, cmd_new};

#[derive(Debug, Clone, serde::Serialize)]
pub struct AttachedItem {
    pub source: String,
    pub dest: String,
}

pub fn artifact_dir_for_entry(entry_md: &Path) -> PathBuf {
    entry_md.with_extension("")
}

fn unsafe_path(message: impl Into<String>) -> CliError {
    CliError::new("UNSAFE_PATH", message)
}

fn assert_in_worktrees(path: &Path, worktree_roots: &[PathBuf], label: &str) -> Result<PathBuf> {
    let canon = path
        .canonicalize()
        .map_err(|_| unsafe_path(format!("cannot resolve {label}: {}", path.display())))?;
    for root in worktree_roots {
        let Ok(root) = root.canonicalize() else {
            continue;
        };
        if canon.starts_with(&root) {
            return Ok(canon);
        }
    }
    Err(CliError::new(
        "VALIDATION_ERROR",
        format!(
            "{label} must be inside this repository's worktrees: {}",
            path.display()
        ),
    )
    .with_suggestions(vec![
        "use a path under the main checkout or a treehouse slot",
        "journal-repo root --plain",
    ]))
}

fn assert_not_under_journal(path: &Path, journal_dir: &Path) -> Result<()> {
    let journal = journal_dir
        .canonicalize()
        .map_err(|_| unsafe_path("cannot resolve journal directory"))?;
    if path.starts_with(&journal) {
        return Err(CliError::new(
            "VALIDATION_ERROR",
            "cannot attach paths inside .journal/",
        ));
    }
    Ok(())
}

fn assert_safe_source(path: &Path) -> Result<()> {
    let meta = fs::symlink_metadata(path).map_err(|_| {
        unsafe_path(format!("cannot read attachment source: {}", path.display()))
    })?;
    if meta.file_type().is_symlink() {
        return Err(unsafe_path(format!(
            "refusing to attach symlink: {}",
            path.display()
        )));
    }
    if !meta.is_file() && !meta.is_dir() {
        return Err(unsafe_path(format!(
            "attachment source must be a file or directory: {}",
            path.display()
        )));
    }
    Ok(())
}

fn assert_safe_bundle_dir(bundle: &Path, journal_dir: &Path) -> Result<()> {
    ensure_journal_dir(journal_dir)?;
    let journal = journal_dir
        .canonicalize()
        .map_err(|_| unsafe_path("cannot resolve journal directory"))?;
    fs::create_dir_all(bundle).map_err(|_| {
        unsafe_path(format!(
            "cannot create artifact directory: {}",
            bundle.display()
        ))
    })?;
    let meta = fs::symlink_metadata(bundle).map_err(|_| {
        unsafe_path(format!(
            "cannot use artifact directory: {}",
            bundle.display()
        ))
    })?;
    if meta.file_type().is_symlink() || !meta.is_dir() {
        return Err(unsafe_path(format!(
            "artifact directory must be a real directory: {}",
            bundle.display()
        )));
    }
    let canon = bundle
        .canonicalize()
        .map_err(|_| unsafe_path("cannot canonicalize artifact directory"))?;
    if !canon.starts_with(&journal) {
        return Err(unsafe_path(format!(
            "artifact directory must stay under .journal/: {}",
            bundle.display()
        )));
    }
    Ok(())
}

fn safe_dest_name(name: &str) -> Result<&str> {
    let path = Path::new(name);
    if name.is_empty()
        || name.contains('/')
        || name.contains('\\')
        || path
            .components()
            .any(|c| !matches!(c, Component::Normal(_)))
    {
        return Err(CliError::new(
            "VALIDATION_ERROR",
            "destination name must be a single path segment",
        ));
    }
    Ok(name)
}

fn copy_file(src: &Path, dest: &Path) -> Result<()> {
    if dest.exists() {
        return Err(CliError::new(
            "VALIDATION_ERROR",
            format!("artifact already exists: {}", dest.display()),
        )
        .with_suggestions(vec!["use --as <name> to choose a different destination name"]));
    }
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| CliError::new("UNKNOWN", e.to_string()))?;
    }
    fs::copy(src, dest).map_err(|e| CliError::new("UNKNOWN", e.to_string()))?;
    Ok(())
}

fn copy_dir_recursive(src: &Path, dest: &Path) -> Result<()> {
    if dest.exists() {
        return Err(CliError::new(
            "VALIDATION_ERROR",
            format!("artifact already exists: {}", dest.display()),
        ));
    }
    fs::create_dir_all(dest).map_err(|e| CliError::new("UNKNOWN", e.to_string()))?;
    for entry in fs::read_dir(src).map_err(|e| CliError::new("UNKNOWN", e.to_string()))? {
        let entry = entry.map_err(|e| CliError::new("UNKNOWN", e.to_string()))?;
        let file_type = entry.file_type().map_err(|e| CliError::new("UNKNOWN", e.to_string()))?;
        if file_type.is_symlink() {
            return Err(unsafe_path(format!(
                "refusing to copy symlink inside directory: {}",
                entry.path().display()
            )));
        }
        let from = entry.path();
        let to = dest.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir_recursive(&from, &to)?;
        } else {
            fs::copy(&from, &to).map_err(|e| CliError::new("UNKNOWN", e.to_string()))?;
        }
    }
    Ok(())
}

pub fn resolve_source_path(
    cwd: &Path,
    worktree_roots: &[PathBuf],
    journal_dir: &Path,
    raw: &str,
) -> Result<PathBuf> {
    let path = Path::new(raw);
    let joined = if path.is_absolute() {
        path.to_path_buf()
    } else {
        cwd.join(path)
    };
    let canon = assert_in_worktrees(&joined, worktree_roots, "attachment source")?;
    assert_not_under_journal(&canon, journal_dir)?;
    assert_safe_source(&canon)?;
    Ok(canon)
}

fn copy_into_bundle(src: &Path, bundle: &Path, dest_name: &str) -> Result<PathBuf> {
    let name = safe_dest_name(dest_name)?;
    let dest = bundle.join(name);
    let meta = fs::metadata(src).map_err(|e| CliError::new("UNKNOWN", e.to_string()))?;
    if meta.is_dir() {
        copy_dir_recursive(src, &dest)?;
    } else {
        copy_file(src, &dest)?;
    }
    Ok(dest)
}

pub fn cmd_attach(
    journal_dir: &Path,
    repo_root: &Path,
    worktree_roots: &[PathBuf],
    cwd: &Path,
    slug_raw: &str,
    source_raws: &[String],
    as_name: Option<&str>,
) -> Result<(PathBuf, String, Vec<AttachedItem>)> {
    if source_raws.is_empty() {
        return Err(
            CliError::new("VALIDATION_ERROR", "attach requires at least one path").with_suggestions(
                vec!["journal-repo attach auth-timeout logs/error.txt"],
            ),
        );
    }
    if as_name.is_some() && source_raws.len() != 1 {
        return Err(CliError::new(
            "VALIDATION_ERROR",
            "--as applies to a single attachment source",
        ));
    }

    let slug = require_slug(slug_raw)?;
    ensure_journal_dir(journal_dir)?;
    let entry_md = match latest_for_slug(journal_dir, &slug)? {
        Some(path) => path,
        None => cmd_new(journal_dir, slug_raw, &[slug_raw.to_string()])?.0,
    };
    let bundle = artifact_dir_for_entry(&entry_md);
    assert_safe_bundle_dir(&bundle, journal_dir)?;

    let mut attached = Vec::new();
    for raw in source_raws {
        let src = resolve_source_path(cwd, worktree_roots, journal_dir, raw)?;
        let dest_name = if let Some(name) = as_name {
            name.to_string()
        } else {
            src.file_name()
                .and_then(|n| n.to_str())
                .ok_or_else(|| CliError::new("VALIDATION_ERROR", "invalid source file name"))?
                .to_string()
        };
        let dest = copy_into_bundle(&src, &bundle, &dest_name)?;
        let source_rel = rel_display(repo_root, &src);
        let dest_rel = rel_display(repo_root, &dest);
        append_bullet(
            &entry_md,
            &format!("attached `{source_rel}` → `{dest_rel}`"),
        )?;
        attached.push(AttachedItem {
            source: source_rel,
            dest: dest_rel,
        });
    }

    Ok((entry_md, slug, attached))
}

pub fn list_artifact_paths(bundle_dir: &Path) -> Result<Vec<String>> {
    if !bundle_dir.is_dir() {
        return Ok(Vec::new());
    }
    let meta = fs::symlink_metadata(bundle_dir).map_err(|_| {
        unsafe_path(format!(
            "cannot read artifact directory: {}",
            bundle_dir.display()
        ))
    })?;
    if meta.file_type().is_symlink() {
        return Err(unsafe_path(format!(
            "artifact directory must be a real directory: {}",
            bundle_dir.display()
        )));
    }

    let mut out = Vec::new();
    collect_files(bundle_dir, bundle_dir, &mut out)?;
    out.sort();
    Ok(out)
}

fn collect_files(root: &Path, dir: &Path, out: &mut Vec<String>) -> Result<()> {
    for entry in fs::read_dir(dir).map_err(|e| CliError::new("UNKNOWN", e.to_string()))? {
        let entry = entry.map_err(|e| CliError::new("UNKNOWN", e.to_string()))?;
        let file_type = entry.file_type().map_err(|e| CliError::new("UNKNOWN", e.to_string()))?;
        if file_type.is_symlink() {
            return Err(unsafe_path(format!(
                "refusing to list symlink in artifacts: {}",
                entry.path().display()
            )));
        }
        let path = entry.path();
        if file_type.is_dir() {
            collect_files(root, &path, out)?;
        } else if file_type.is_file() {
            let rel = path
                .strip_prefix(root)
                .map(|p| p.display().to_string())
                .unwrap_or_else(|_| path.display().to_string());
            out.push(rel);
        }
    }
    Ok(())
}

pub fn artifact_count_for_entry(entry_md: &Path) -> Result<usize> {
    Ok(list_artifact_paths(&artifact_dir_for_entry(entry_md))?.len())
}

pub fn rel_display(repo_root: &Path, abs: &Path) -> String {
    abs.strip_prefix(repo_root)
        .map(|p| p.display().to_string())
        .unwrap_or_else(|_| abs.display().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::journal::latest_for_slug;
    use std::fs;

    #[test]
    fn attach_file_and_list() {
        let dir = tempfile::tempdir().unwrap();
        let repo = dir.path().join("repo");
        let journal = repo.join(".journal");
        fs::create_dir_all(&repo).unwrap();
        let sample = repo.join("sample.txt");
        fs::write(&sample, b"hello").unwrap();

        let roots = vec![repo.clone()];
        let (_, slug, items) = cmd_attach(
            &journal,
            &repo,
            &roots,
            &repo,
            "demo",
            &[String::from("sample.txt")],
            None,
        )
        .unwrap();
        assert_eq!(slug, "demo");
        assert_eq!(items.len(), 1);
        let entry = latest_for_slug(&journal, "demo").unwrap().unwrap();
        let files = list_artifact_paths(&artifact_dir_for_entry(&entry)).unwrap();
        assert_eq!(files, vec!["sample.txt"]);
    }

    #[test]
    fn rejects_outside_repo() {
        let dir = tempfile::tempdir().unwrap();
        let repo = dir.path().join("repo");
        fs::create_dir_all(&repo).unwrap();
        let outside = dir.path().join("outside.txt");
        fs::write(&outside, b"x").unwrap();
        let roots = vec![repo.clone()];
        let err = resolve_source_path(
            &repo,
            &roots,
            &repo.join(".journal"),
            outside.to_str().unwrap(),
        )
        .unwrap_err();
        assert_eq!(err.code, "VALIDATION_ERROR");
    }
}
