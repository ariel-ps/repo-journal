use std::collections::BTreeMap;
use std::path::Path;

use serde_json::Value;

use crate::error::{CliError, Result};

pub fn collapse_home(path: &Path) -> String {
    if let Ok(home) = std::env::var("HOME") {
        let home = Path::new(&home);
        if let Ok(stripped) = path.strip_prefix(home) {
            return format!("~{}", stripped.display());
        }
    }
    path.display().to_string()
}

pub fn home_header(description: &str) -> BTreeMap<String, Value> {
    let mut map = BTreeMap::new();
    map.insert(
        "bin".into(),
        Value::String(
            std::env::args()
                .nth(0)
                .map(|a| collapse_home(Path::new(&a)))
                .unwrap_or_default(),
        ),
    );
    map.insert("description".into(), Value::String(description.to_string()));
    map
}

pub fn with_help(mut body: BTreeMap<String, Value>, help: Vec<&str>) -> BTreeMap<String, Value> {
    if !help.is_empty() {
        body.insert(
            "help".into(),
            Value::Array(help.into_iter().map(|s| Value::String(s.to_string())).collect()),
        );
    }
    body
}

pub fn emit(value: &Value, plain: bool, json: bool) -> Result<String> {
    if json {
        return Ok(format!("{value}\n"));
    }
    if plain {
        return Err(CliError::new(
            "VALIDATION_ERROR",
            "plain output requires a string payload from the command handler",
        ));
    }
    let toon = serde_toon::to_string(value).map_err(|e| {
        CliError::new("UNKNOWN", format!("failed to encode TOON output: {e}"))
    })?;
    Ok(format!("{toon}\n"))
}

pub fn rel_path(repo_root: &Path, abs: &Path) -> String {
    abs.strip_prefix(repo_root)
        .map(|p| p.display().to_string())
        .unwrap_or_else(|_| abs.display().to_string())
}
