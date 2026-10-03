use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::Path;

use crate::error::{CliError, Result};

pub const GITIGNORE_BLOCK: &str = "# Journal Repo — local investigation scratch (journal-repo)
/.journal/
";

fn parse_journal_line(line: &str) -> Option<bool> {
    let (negated, rest) = if let Some(rest) = line.strip_prefix('!') {
        (true, rest)
    } else {
        (false, line)
    };
    let mut rest = rest.trim();
    if let Some(stripped) = rest.strip_prefix('/') {
        rest = stripped;
    }
    if let Some(stripped) = rest.strip_suffix('/') {
        rest = stripped;
    }
    if rest == ".journal" {
        Some(!negated)
    } else {
        None
    }
}

fn journal_rule_is_effective(text: &str) -> bool {
    let mut ignored = false;
    for raw_line in text.lines() {
        if let Some(is_ignore) = parse_journal_line(raw_line.trim()) {
            ignored = is_ignore;
        }
    }
    ignored
}

fn read_gitignore(path: &Path) -> Result<Option<String>> {
    let meta = match fs::symlink_metadata(path) {
        Ok(m) => m,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(_) => {
            return Err(CliError::new(
                "UNSAFE_PATH",
                format!("refusing to read unsafe path: {}", path.display()),
            ));
        }
    };
    if meta.file_type().is_symlink() || !meta.is_file() {
        return Err(CliError::new(
            "UNSAFE_PATH",
            format!(".gitignore must be a regular file: {}", path.display()),
        ));
    }
    let buf = fs::read_to_string(path).map_err(|_| {
        CliError::new(
            "UNSAFE_PATH",
            format!("refusing to read unsafe path: {}", path.display()),
        )
    })?;
    Ok(Some(buf))
}

pub fn journal_ignored_in_gitignore(repo_root: &Path) -> Result<bool> {
    let path = repo_root.join(".gitignore");
    Ok(read_gitignore(&path)?.is_some_and(|t| journal_rule_is_effective(&t)))
}

pub fn ensure_journal_gitignore(repo_root: &Path) -> Result<&'static str> {
    let path = repo_root.join(".gitignore");
    let text = read_gitignore(&path)?;
    if text.as_ref().is_some_and(|t| journal_rule_is_effective(t)) {
        return Ok("ok");
    }
    let sep = match &text {
        None => "",
        Some(t) if t.is_empty() || t.ends_with('\n') => "",
        Some(_) => "\n",
    };
    let payload = format!("{sep}{GITIGNORE_BLOCK}");
    if text.is_none() {
        fs::write(&path, payload.as_bytes()).map_err(|_| {
            CliError::new(
                "UNSAFE_PATH",
                format!("refusing to write unsafe path: {}", path.display()),
            )
        })?;
    } else {
        let mut file = OpenOptions::new()
            .append(true)
            .open(&path)
            .map_err(|_| {
                CliError::new(
                    "UNSAFE_PATH",
                    format!("refusing to write unsafe path: {}", path.display()),
                )
            })?;
        file.write_all(payload.as_bytes())
            .map_err(|e| CliError::new("UNKNOWN", e.to_string()))?;
    }
    Ok("appended")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::fs::symlink;

    #[test]
    fn appends_journal_rule() {
        let dir = tempfile::tempdir().unwrap();
        assert!(!journal_ignored_in_gitignore(dir.path()).unwrap());
        assert_eq!(ensure_journal_gitignore(dir.path()).unwrap(), "appended");
        assert!(journal_ignored_in_gitignore(dir.path()).unwrap());
        let text = fs::read_to_string(dir.path().join(".gitignore")).unwrap();
        assert!(text.contains("/.journal/"));
        assert_eq!(ensure_journal_gitignore(dir.path()).unwrap(), "ok");
    }

    #[test]
    fn refuses_symlink_gitignore() {
        let dir = tempfile::tempdir().unwrap();
        let outside = dir.path().join("outside");
        fs::write(&outside, "preserved\n").unwrap();
        symlink(&outside, dir.path().join(".gitignore")).unwrap();
        let err = ensure_journal_gitignore(dir.path()).unwrap_err();
        assert!(err.message.contains("regular file") || err.message.contains("unsafe"));
        assert_eq!(fs::read_to_string(&outside).unwrap(), "preserved\n");
    }

    #[test]
    fn repairs_negation() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(
            dir.path().join(".gitignore"),
            "/.journal/\n!/.journal/\n",
        )
        .unwrap();
        assert!(!journal_ignored_in_gitignore(dir.path()).unwrap());
        ensure_journal_gitignore(dir.path()).unwrap();
        assert!(journal_ignored_in_gitignore(dir.path()).unwrap());
    }
}
