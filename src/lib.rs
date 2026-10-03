mod cli;
mod context;
mod error;
mod git;
mod gitignore;
mod human;
mod journal;
mod output;

pub use error::CliError;
pub use journal::{cmd_add, cmd_new, ensure_journal_dir, list_entries, slugify, today_iso};

pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const DESCRIPTION: &str =
    "Git-root .journal/ scratch for agent investigations. Human-readable by default; --json, --toon, or --plain for machines.";

pub fn run(args: Vec<String>) -> Result<(), CliError> {
    cli::run(args)
}
