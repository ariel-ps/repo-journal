mod artifacts;
mod cli;
mod context;
mod treehouse;
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
    "Git-root .journal/ scratch for investigations (Treehouse-only worktrees). Journal on main checkout; human output by default.";

pub fn run(args: Vec<String>) -> Result<(), CliError> {
    cli::run(args)
}
