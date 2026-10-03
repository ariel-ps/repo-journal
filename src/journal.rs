use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

use chrono::Local;

use crate::error::{CliError, Result};

#[derive(Debug, Clone, serde::Serialize)]
pub struct JournalEntryMeta {
    pub slug: String,
    pub date: String,
    pub title: String,
    pub basename: String,
    pub path: String,
    pub attachments: usize,
}

pub fn slugify(raw: &str) -> String {
    let lower = raw.to_lowercase();
    let mut out = String::new();
    let mut prev_hyphen = false;
    for ch in lower.chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch);
            prev_hyphen = false;
        } else if !prev_hyphen {
            out.push('-');
            prev_hyphen = true;
        }
    }
    out.trim_matches('-').to_string()
}

pub fn require_slug(raw: &str) -> Result<String> {
    let slug = slugify(raw);
    if slug.is_empty() {
        return Err(CliError::new(
            "VALIDATION_ERROR",
            "slug must contain at least one letter or digit",
        ));
    }
    Ok(slug)
}

pub fn today_iso() -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

fn now_time() -> String {
    Local::now().format("%H:%M").to_string()
}

fn now_stamp() -> String {
    Local::now().format("%Y-%m-%d %H:%M").to_string()
}

fn unsafe_path(message: impl Into<String>) -> CliError {
    CliError::new("UNSAFE_PATH", message)
}

fn assert_regular_file(path: &Path) -> Result<()> {
    let meta = fs::symlink_metadata(path).map_err(|_| {
        unsafe_path(format!("refusing to read unsafe journal path: {}", path.display()))
    })?;
    if meta.file_type().is_symlink() || !meta.is_file() {
        return Err(unsafe_path(format!(
            "journal entry is not a regular file: {}",
            path.display()
        )));
    }
    Ok(())
}

fn read_regular_file(path: &Path) -> Result<String> {
    assert_regular_file(path)?;
    fs::read_to_string(path).map_err(|_| {
        unsafe_path(format!("refusing to read unsafe journal path: {}", path.display()))
    })
}

fn append_regular_file(path: &Path, text: &str) -> Result<()> {
    assert_regular_file(path)?;
    let mut file = OpenOptions::new()
        .append(true)
        .open(path)
        .map_err(|_| unsafe_path(format!("refusing to write unsafe journal path: {}", path.display())))?;
    file.write_all(text.as_bytes())
        .map_err(|e| CliError::new("UNKNOWN", e.to_string()))?;
    Ok(())
}

fn create_regular_file(path: &Path, text: &str) -> Result<bool> {
    use std::io::ErrorKind;
    match OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
    {
        Ok(mut file) => {
            file.write_all(text.as_bytes())
                .map_err(|e| CliError::new("UNKNOWN", e.to_string()))?;
            Ok(true)
        }
        Err(e) if e.kind() == ErrorKind::AlreadyExists => {
            read_regular_file(path)?;
            Ok(false)
        }
        Err(_) => Err(unsafe_path(format!(
            "refusing to create unsafe journal path: {}",
            path.display()
        ))),
    }
}

pub fn ensure_journal_dir(journal_dir: &Path) -> Result<()> {
    fs::create_dir_all(journal_dir).map_err(|_| {
        unsafe_path(format!("cannot safely use journal directory: {}", journal_dir.display()))
    })?;
    let meta = fs::symlink_metadata(journal_dir).map_err(|_| {
        unsafe_path(format!("cannot safely use journal directory: {}", journal_dir.display()))
    })?;
    if meta.file_type().is_symlink() || !meta.is_dir() {
        return Err(unsafe_path(format!(
            "journal directory must be a real directory: {}",
            journal_dir.display()
        )));
    }
    let parent = journal_dir
        .parent()
        .ok_or_else(|| unsafe_path("journal directory has no parent"))?;
    let expected = parent
        .canonicalize()
        .map_err(|_| unsafe_path("cannot canonicalize journal parent"))?
        .join(
            journal_dir
                .file_name()
                .ok_or_else(|| unsafe_path("journal directory has no name"))?,
        );
    let actual = journal_dir
        .canonicalize()
        .map_err(|_| unsafe_path("cannot canonicalize journal directory"))?;
    if expected != actual {
        return Err(unsafe_path(format!(
            "journal directory must be a real directory: {}",
            journal_dir.display()
        )));
    }
    Ok(())
}

fn parse_basename(name: &str) -> Option<(String, String)> {
    let stem = name.strip_suffix(".md")?;
    if stem.len() < 12 {
        return None;
    }
    let (date, slug) = stem.split_at(10);
    if !date.chars().all(|c| c.is_ascii_digit() || c == '-') {
        return None;
    }
    let slug = slug.strip_prefix('-')?;
    if slug.is_empty() {
        return None;
    }
    Some((date.to_string(), slug.to_string()))
}

fn read_title(path: &Path) -> Result<String> {
    let content = read_regular_file(path)?;
    let first = content.lines().next().unwrap_or("");
    let title = first.trim_start_matches('#').trim();
    Ok(if title.is_empty() {
        "untitled".to_string()
    } else {
        title.to_string()
    })
}

pub fn list_entry_files(journal_dir: &Path) -> Result<Vec<PathBuf>> {
    match fs::symlink_metadata(journal_dir) {
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(_) => {
            return Err(unsafe_path(format!(
                "cannot safely read journal directory: {}",
                journal_dir.display()
            )));
        }
        Ok(meta) => {
            if meta.file_type().is_symlink() || !meta.is_dir() {
                return Err(unsafe_path(format!(
                    "journal directory must be a real directory: {}",
                    journal_dir.display()
                )));
            }
        }
    }
    let mut names: Vec<String> = fs::read_dir(journal_dir)
        .map_err(|_| unsafe_path(format!("cannot safely read journal directory: {}", journal_dir.display())))?
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_type()
                .map(|t| t.is_file())
                .unwrap_or(false)
                && e.file_name().to_string_lossy().ends_with(".md")
        })
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .collect();
    names.sort();
    names.reverse();
    Ok(names
        .into_iter()
        .map(|n| journal_dir.join(n))
        .collect())
}

pub fn list_entries(journal_dir: &Path) -> Result<Vec<JournalEntryMeta>> {
    let mut out = Vec::new();
    for path in list_entry_files(journal_dir)? {
        let base = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or_default();
        let Some((date, slug)) = parse_basename(base) else {
            continue;
        };
        out.push(JournalEntryMeta {
            slug: slug.clone(),
            date,
            title: read_title(&path)?,
            basename: base.strip_suffix(".md").unwrap_or(base).to_string(),
            path: path.to_string_lossy().into_owned(),
            attachments: 0,
        });
    }
    Ok(out)
}

pub fn latest_for_slug(journal_dir: &Path, slug: &str) -> Result<Option<PathBuf>> {
    Ok(list_entry_files(journal_dir)?
        .into_iter()
        .find(|path| {
            path.file_name()
                .and_then(|n| n.to_str())
                .and_then(parse_basename)
                .map(|(_, s)| s == slug)
                .unwrap_or(false)
        }))
}

pub fn cmd_new(
    journal_dir: &Path,
    slug_raw: &str,
    title_words: &[String],
) -> Result<(PathBuf, bool, String)> {
    let slug = require_slug(slug_raw)?;
    ensure_journal_dir(journal_dir)?;
    let date = today_iso();
    let file = journal_dir.join(format!("{date}-{slug}.md"));
    let title = if title_words.is_empty() {
        slug_raw.to_string()
    } else {
        title_words.join(" ")
    };
    let body = format!(
        "# {title}\n\n_Investigation started {stamp}_\n\n## Findings\n",
        stamp = now_stamp()
    );
    if !create_regular_file(&file, &body)? {
        return Ok((file, false, slug));
    }
    Ok((file, true, slug))
}

pub fn cmd_add(
    journal_dir: &Path,
    slug_raw: &str,
    note_parts: &[String],
) -> Result<(PathBuf, String)> {
    let slug = require_slug(slug_raw)?;
    ensure_journal_dir(journal_dir)?;
    let file = match latest_for_slug(journal_dir, &slug)? {
        Some(path) => path,
        None => cmd_new(journal_dir, slug_raw, &[slug_raw.to_string()])?.0,
    };
    let note = note_parts.join(" ");
    append_bullet(&file, &note)?;
    Ok((file, slug))
}

pub fn append_bullet(path: &Path, note: &str) -> Result<()> {
    append_regular_file(path, &format!("- **{}** {note}\n", now_time()))
}

pub fn read_entry_content(path: &Path, full: bool) -> Result<(String, bool)> {
    let content = read_regular_file(path)?;
    if full {
        return Ok((content, false));
    }
    const MAX: usize = 4000;
    if content.len() <= MAX {
        return Ok((content, false));
    }
    let truncated = format!(
        "{}\n\n… ({} more chars; use --full)\n",
        &content[..MAX],
        content.len() - MAX
    );
    Ok((truncated, true))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::fs::symlink;

    #[test]
    fn slugify_normalizes() {
        assert_eq!(slugify("Auth Timeout!"), "auth-timeout");
    }

    #[test]
    fn new_is_idempotent() {
        let dir = tempfile::tempdir().unwrap();
        let journal = dir.path().join(".journal");
        let (a, created, _) = cmd_new(&journal, "auth-timeout", &["Title".into()]).unwrap();
        let (b, again, _) = cmd_new(&journal, "auth-timeout", &["Other".into()]).unwrap();
        assert_eq!(a, b);
        assert!(created);
        assert!(!again);
    }

    #[test]
    fn rejects_empty_slug() {
        let dir = tempfile::tempdir().unwrap();
        let err = cmd_new(&dir.path().join(".journal"), "!!!", &[]).unwrap_err();
        assert!(err.message.contains("letter or digit"));
    }

    #[test]
    fn exact_slug_match_on_add() {
        let dir = tempfile::tempdir().unwrap();
        let journal = dir.path().join(".journal");
        cmd_new(&journal, "auth-timeout", &["Auth".into()]).unwrap();
        cmd_add(&journal, "timeout", &["Timeout".into()]).unwrap();
        let mut slugs: Vec<_> = list_entries(&journal)
            .unwrap()
            .into_iter()
            .map(|e| e.slug)
            .collect();
        slugs.sort();
        assert_eq!(slugs, vec!["auth-timeout", "timeout"]);
    }

    #[test]
    fn refuses_symlink_journal() {
        let dir = tempfile::tempdir().unwrap();
        let repo = dir.path().join("repo");
        let outside = dir.path().join("outside");
        fs::create_dir_all(&repo).unwrap();
        fs::create_dir_all(&outside).unwrap();
        symlink(&outside, repo.join(".journal")).unwrap();
        let err = cmd_new(&repo.join(".journal"), "escape", &[]).unwrap_err();
        assert!(err.message.contains("real directory") || err.message.contains("safely"));
        assert!(fs::read_dir(&outside).unwrap().next().is_none());
    }
}
