use std::collections::{BTreeMap, BTreeSet};
use std::io::{self, Write};
use serde_json::{json, Value};

use crate::context::{journal_context_from_env, JournalContext};
use crate::error::{CliError, Result};
use crate::git::{git_status, list_tracked_journal_files};
use crate::gitignore::{ensure_journal_gitignore, journal_ignored_in_gitignore};
use crate::journal::{
    cmd_add, cmd_new, ensure_journal_dir, latest_for_slug, list_entries, read_entry_content,
    require_slug,
};
use crate::human::{self, Style};
use crate::output::{emit, home_header, rel_path, with_help};
use crate::VERSION;

const DEFAULT_LIST: usize = 20;

struct GlobalFlags {
    stripped: Vec<String>,
    plain: bool,
    json: bool,
    toon: bool,
}

enum OutputMode {
    Human,
    Json,
    Toon,
}

impl GlobalFlags {
    fn output_mode(&self) -> OutputMode {
        if self.json {
            OutputMode::Json
        } else if self.toon {
            OutputMode::Toon
        } else {
            OutputMode::Human
        }
    }
}

fn parse_global_flags(args: &[String]) -> GlobalFlags {
    let mut stripped = Vec::new();
    let mut plain = false;
    let mut json = false;
    let mut toon = false;
    for arg in args {
        match arg.as_str() {
            "--plain" => plain = true,
            "--json" => json = true,
            "--toon" => toon = true,
            _ => stripped.push(arg.clone()),
        }
    }
    GlobalFlags {
        stripped,
        plain,
        json,
        toon,
    }
}

fn take_flag(stripped: &[String], name: &str) -> (Vec<String>, bool) {
    let mut out = Vec::new();
    let mut present = false;
    for arg in stripped {
        if arg == name {
            present = true;
        } else {
            out.push(arg.clone());
        }
    }
    (out, present)
}

fn should_ensure_gitignore() -> bool {
    std::env::var("REPO_JOURNAL_ENSURE_GITIGNORE").ok().as_deref() != Some("0")
}

fn ensure_policy(ctx: &JournalContext) -> Result<&'static str> {
    if !should_ensure_gitignore() {
        return Ok("skipped");
    }
    ensure_journal_gitignore(&ctx.repo_root)
}

fn print_out(text: &str) -> Result<()> {
    io::stdout()
        .write_all(text.as_bytes())
        .map_err(|e| CliError::new("UNKNOWN", e.to_string()))?;
    Ok(())
}

fn print_value(value: &Value, mode: OutputMode, human: &str) -> Result<()> {
    let text = match mode {
        OutputMode::Json => format!("{value}\n"),
        OutputMode::Toon => emit(value, false, false)?,
        OutputMode::Human => {
            let mut h = human.to_string();
            if !h.ends_with('\n') {
                h.push('\n');
            }
            h
        }
    };
    print_out(&text)
}

pub fn run(args: Vec<String>) -> Result<()> {
    if args.iter().any(|a| a == "--help" || a == "-h") {
        print_out(&human::format_help())?;
        return Ok(());
    }
    if args.iter().any(|a| a == "--version" || a == "-v") {
        print_out(&format!("repo-journal {VERSION}\n"))?;
        return Ok(());
    }

    let dashboard_only = !args.is_empty()
        && args
            .iter()
            .all(|a| a == "--plain" || a == "--json" || a == "--toon");
    let mut argv = args;
    if dashboard_only {
        argv.insert(0, "dashboard".into());
    } else if argv.is_empty() {
        argv.push("dashboard".into());
    }

    let json_errors = argv.contains(&"--json".to_string());
    let command = argv[0].clone();
    let rest: Vec<String> = argv[1..].to_vec();

    if command == "complete" {
        return cmd_complete(&rest);
    }

    let ctx = match journal_context_from_env() {
        Ok(c) => c,
        Err(e) => return fail_or_return(e, json_errors),
    };

    let result = match command.as_str() {
        "dashboard" => cmd_dashboard(&rest, &ctx),
        "new" => cmd_new_handler(&rest, &ctx),
        "add" => cmd_add_handler(&rest, &ctx),
        "list" => cmd_list(&rest, &ctx),
        "show" => cmd_show(&rest, &ctx),
        "path" => cmd_path(&rest, &ctx),
        "root" => cmd_root(&rest, &ctx),
        "doctor" => cmd_doctor(&rest, &ctx),
        "ensure-gitignore" => cmd_ensure_gitignore(&rest, &ctx),
        other => {
            let err = CliError::new(
                "VALIDATION_ERROR",
                format!("Unknown command: {other}"),
            )
            .with_suggestions(vec!["Run `--help` to see available commands"]);
            return fail_or_return(err, json_errors);
        }
    };
    if let Err(err) = result {
        return fail_or_return(err, json_errors);
    }
    Ok(())
}

fn fail_or_return(err: CliError, json: bool) -> Result<()> {
    if json {
        print_out(&format!("{}\n", err.to_json()))?;
        std::process::exit(err.exit_code().into());
    }
    Err(err)
}

fn cmd_complete(args: &[String]) -> Result<()> {
    let flags = parse_global_flags(args);
    if flags.stripped.len() != 1 || flags.stripped[0] != "slugs" {
        return Err(
            CliError::new("VALIDATION_ERROR", "complete requires: slugs").with_suggestions(vec![
                "repo-journal complete slugs",
            ]),
        );
    }
    if flags.plain || flags.json || flags.toon {
        return Err(CliError::new(
            "VALIDATION_ERROR",
            "complete slugs does not accept output flags",
        ));
    }

    let Ok(ctx) = journal_context_from_env() else {
        return Ok(());
    };
    let Ok(entries) = list_entries(&ctx.journal_dir) else {
        return Ok(());
    };
    let mut seen = BTreeSet::new();
    for entry in entries {
        if seen.insert(entry.slug.clone()) {
            print_out(&format!("{}\n", entry.slug))?;
        }
    }
    Ok(())
}

fn unexpected_args(stripped: &[String]) -> Result<()> {
    if stripped.is_empty() {
        return Ok(());
    }
    Err(CliError::new(
        "VALIDATION_ERROR",
        format!("unexpected arguments: {}", stripped.join(" ")),
    ))
}

fn cmd_dashboard(args: &[String], ctx: &JournalContext) -> Result<()> {
    let flags = parse_global_flags(args);
    unexpected_args(&flags.stripped)?;

    let git = git_status(&ctx.repo_root);
    let tracked = list_tracked_journal_files(&ctx.repo_root);
    let gitignore_ok = journal_ignored_in_gitignore(&ctx.repo_root)?;
    let entries = list_entries(&ctx.journal_dir)?;
    let recent: Vec<_> = entries.iter().take(DEFAULT_LIST).cloned().collect();

    if flags.plain {
        return print_out(&format!("{}\n", ctx.journal_dir.display()));
    }

    let mode = flags.output_mode();
    let human = human::format_dashboard(
        &Style::detect(),
        &ctx.repo_root,
        &ctx.journal_dir,
        &git,
        gitignore_ok,
        &entries,
        &recent,
        should_ensure_gitignore(),
    );

    let help_strings: Vec<String> = if entries.is_empty() {
        vec!["repo-journal new <slug> \"<title>\"".into()]
    } else {
        vec![
            format!("repo-journal show {}", recent[0].slug),
            "repo-journal new <slug> \"<title>\"".into(),
        ]
    };
    let help: Vec<&str> = help_strings.iter().map(String::as_str).collect();

    let mut body = home_header(crate::DESCRIPTION);
    body.insert("repo_root".into(), json!(ctx.repo_root));
    body.insert("journal_dir".into(), json!(ctx.journal_dir));
    body.insert("git".into(), json!(git));
    body.insert(
        "policy".into(),
        json!({
            "gitignore": if gitignore_ok { "ok" } else { "missing" },
            "tracked_journal_files": tracked.len(),
            "ensure_gitignore": should_ensure_gitignore(),
        }),
    );
    body.insert(
        "summary".into(),
        json!({
            "entries_total": entries.len(),
            "entries_shown": recent.len(),
            "empty": entries.is_empty(),
        }),
    );
    body.insert(
        "entries_recent".into(),
        json!(recent
            .iter()
            .map(|e| json!({"slug": e.slug, "date": e.date, "title": e.title}))
            .collect::<Vec<_>>()),
    );
    let body = with_help(body, help);
    let value = Value::Object(body.into_iter().collect());
    print_value(&value, mode, &human)?;
    Ok(())
}

fn cmd_new_handler(args: &[String], ctx: &JournalContext) -> Result<()> {
    let flags = parse_global_flags(args);
    if flags.stripped.is_empty() {
        return Err(
            CliError::new("VALIDATION_ERROR", "new requires a slug").with_suggestions(vec![
                "repo-journal new auth-timeout \"Why login times out\"",
            ]),
        );
    }
    let slug_raw = &flags.stripped[0];
    require_slug(slug_raw)?;
    let title_words: Vec<String> = flags.stripped[1..].to_vec();
    let gitignore = ensure_policy(ctx)?;
    let (path, created, slug) = cmd_new(&ctx.journal_dir, slug_raw, &title_words)?;

    if flags.plain {
        return print_out(&format!("{}\n", path.display()));
    }

    let rel = rel_path(&ctx.repo_root, &path);
    let human = human::format_new(&rel, &slug, created, gitignore);
    let mode = flags.output_mode();

    let help_strings = vec![
        format!("repo-journal add {slug} \"<finding>\""),
        format!("repo-journal show {slug}"),
    ];
    let help: Vec<&str> = help_strings.iter().map(String::as_str).collect();
    let mut body = BTreeMap::new();
    body.insert(
        "ok".into(),
        json!({
            "op": "new",
            "slug": slug,
            "path": rel,
            "created": created,
            "gitignore": gitignore,
        }),
    );
    let body = with_help(body, help);
    let value = Value::Object(body.into_iter().collect());
    print_value(&value, mode, &human)?;
    Ok(())
}

fn cmd_add_handler(args: &[String], ctx: &JournalContext) -> Result<()> {
    let flags = parse_global_flags(args);
    if flags.stripped.len() < 2 {
        return Err(
            CliError::new("VALIDATION_ERROR", "add requires a slug and note text").with_suggestions(
                vec!["repo-journal add auth-timeout \"repro at 40 logins\""],
            ),
        );
    }
    let slug_raw = &flags.stripped[0];
    require_slug(slug_raw)?;
    let note: Vec<String> = flags.stripped[1..].to_vec();
    ensure_policy(ctx)?;
    let (path, slug) = cmd_add(&ctx.journal_dir, slug_raw, &note)?;

    if flags.plain {
        return print_out(&format!("{}\n", path.display()));
    }

    let rel = rel_path(&ctx.repo_root, &path);
    let human = human::format_add(&rel, &slug);
    let mode = flags.output_mode();

    let help_strings = vec![
        format!("repo-journal show {slug}"),
        format!("repo-journal show {slug} --full"),
    ];
    let help: Vec<&str> = help_strings.iter().map(String::as_str).collect();
    let mut body = BTreeMap::new();
    body.insert(
        "ok".into(),
        json!({
            "op": "add",
            "slug": slug,
            "path": rel,
        }),
    );
    let body = with_help(body, help);
    let value = Value::Object(body.into_iter().collect());
    print_value(&value, mode, &human)?;
    Ok(())
}

fn cmd_list(args: &[String], ctx: &JournalContext) -> Result<()> {
    let flags = parse_global_flags(args);
    let (after_all, all_long) = take_flag(&flags.stripped, "--all");
    let (stripped, all_short) = take_flag(&after_all, "-a");
    unexpected_args(&stripped)?;
    let all = all_long || all_short;

    let entries = list_entries(&ctx.journal_dir)?;
    let shown: Vec<_> = if all {
        entries.clone()
    } else {
        entries.iter().take(DEFAULT_LIST).cloned().collect()
    };

    if flags.plain {
        let text = shown
            .iter()
            .map(|e| format!("{}  {}", e.basename, e.title))
            .collect::<Vec<_>>()
            .join("\n");
        return print_out(&format!("{text}\n"));
    }

    let truncated = !all && entries.len() > DEFAULT_LIST;
    let human = human::format_list(&shown, truncated);
    let mode = flags.output_mode();

    let body = if entries.is_empty() {
        with_help(
            BTreeMap::from([
                ("entries".into(), json!([])),
                (
                    "summary".into(),
                    json!({"shown": 0, "total": 0, "empty": true}),
                ),
            ]),
            vec!["repo-journal new <slug> \"<title>\""],
        )
    } else {
        with_help(
            BTreeMap::from([
                (
                    "entries".into(),
                    json!(shown
                        .iter()
                        .map(|e| json!({"slug": e.slug, "date": e.date, "title": e.title}))
                        .collect::<Vec<_>>()),
                ),
                (
                    "summary".into(),
                    json!({
                        "shown": shown.len(),
                        "total": entries.len(),
                        "truncated": !all && entries.len() > DEFAULT_LIST,
                    }),
                ),
            ]),
            vec!["repo-journal show <slug>", "repo-journal list --all"],
        )
    };
    let value = Value::Object(body.into_iter().collect());
    print_value(&value, mode, &human)?;
    Ok(())
}

fn cmd_show(args: &[String], ctx: &JournalContext) -> Result<()> {
    let flags = parse_global_flags(args);
    let (stripped, full) = take_flag(&flags.stripped, "--full");
    if stripped.len() != 1 {
        return Err(
            CliError::new("VALIDATION_ERROR", "show requires exactly one slug").with_suggestions(
                vec!["repo-journal show auth-timeout"],
            ),
        );
    }
    let slug = require_slug(&stripped[0])?;
    let file = latest_for_slug(&ctx.journal_dir, &slug)?.ok_or_else(|| {
        CliError::new(
            "NOT_FOUND",
            format!(
                "no entry matching '{}' under {}",
                stripped[0],
                ctx.journal_dir.display()
            ),
        )
        .with_suggestions(vec![
            "repo-journal list",
            &format!("repo-journal new {} \"<title>\"", stripped[0]),
        ])
    })?;

    let (content, truncated) = read_entry_content(&file, full || flags.plain)?;
    if flags.plain {
        return print_out(&content);
    }

    let rel = rel_path(&ctx.repo_root, &file);
    let human = human::format_show(&slug, &rel, &content, truncated);
    let mode = flags.output_mode();

    let help_string = format!("repo-journal show {slug} --full");
    let help: Vec<&str> = if truncated {
        vec![help_string.as_str()]
    } else {
        vec![]
    };
    let body = BTreeMap::from([
        ("slug".into(), json!(slug)),
        ("path".into(), json!(rel)),
        ("truncated".into(), json!(truncated)),
        ("content".into(), json!(content)),
    ]);
    let body = with_help(body, help);
    let value = Value::Object(body.into_iter().collect());
    print_value(&value, mode, &human)?;
    Ok(())
}

fn cmd_path(args: &[String], ctx: &JournalContext) -> Result<()> {
    let flags = parse_global_flags(args);
    unexpected_args(&flags.stripped)?;
    ensure_journal_dir(&ctx.journal_dir)?;
    ensure_policy(ctx)?;
    if flags.plain {
        return print_out(&format!("{}\n", ctx.journal_dir.display()));
    }
    let human = human::format_path_label("journal", &ctx.journal_dir);
    let body = json!({ "journal_dir": ctx.journal_dir });
    print_value(&body, flags.output_mode(), &human)?;
    Ok(())
}

fn cmd_root(args: &[String], ctx: &JournalContext) -> Result<()> {
    let flags = parse_global_flags(args);
    unexpected_args(&flags.stripped)?;
    if flags.plain {
        return print_out(&format!("{}\n", ctx.repo_root.display()));
    }
    let human = human::format_path_label("repository", &ctx.repo_root);
    let body = json!({ "repo_root": ctx.repo_root });
    print_value(&body, flags.output_mode(), &human)?;
    Ok(())
}

fn cmd_doctor(args: &[String], ctx: &JournalContext) -> Result<()> {
    let flags = parse_global_flags(args);
    unexpected_args(&flags.stripped)?;

    let git = git_status(&ctx.repo_root);
    let tracked = list_tracked_journal_files(&ctx.repo_root);
    let gitignore_ok = journal_ignored_in_gitignore(&ctx.repo_root)?;
    let mut issues = Vec::new();
    if !gitignore_ok {
        issues.push("gitignore_missing");
    }
    if !tracked.is_empty() {
        issues.push("journal_tracked_in_git");
    }

    if flags.plain {
        let text = if issues.is_empty() {
            "ok".to_string()
        } else {
            issues.join(",")
        };
        return print_out(&format!("{text}\n"));
    }

    let human = human::format_doctor(
        issues.is_empty(),
        &ctx.repo_root,
        &ctx.journal_dir,
        gitignore_ok,
        tracked.len(),
        &issues,
    );
    let mode = flags.output_mode();

    let mut help = vec!["repo-journal new <slug> \"<title>\"".to_string()];
    if !gitignore_ok {
        help.insert(0, "repo-journal ensure-gitignore".into());
    }
    if !tracked.is_empty() {
        help.insert(
            0,
            "git rm -r --cached .journal/  # then commit if you intentionally track nothing"
                .into(),
        );
    }
    let help_refs: Vec<&str> = help.iter().map(String::as_str).collect();

    let body = BTreeMap::from([
        ("ok".into(), json!(issues.is_empty())),
        ("repo_root".into(), json!(ctx.repo_root)),
        ("journal_dir".into(), json!(ctx.journal_dir)),
        ("git".into(), json!(git)),
        (
            "gitignore".into(),
            json!(if gitignore_ok { "ok" } else { "missing" }),
        ),
        ("tracked_journal_files".into(), json!(tracked.len())),
        (
            "tracked_paths".into(),
            json!(tracked.iter().take(5).collect::<Vec<_>>()),
        ),
        ("issues".into(), json!(issues)),
    ]);
    let body = with_help(body, help_refs);
    let value = Value::Object(body.into_iter().collect());
    print_value(&value, mode, &human)?;
    Ok(())
}

fn cmd_ensure_gitignore(args: &[String], ctx: &JournalContext) -> Result<()> {
    let flags = parse_global_flags(args);
    unexpected_args(&flags.stripped)?;
    let result = ensure_journal_gitignore(&ctx.repo_root)?;
    if flags.plain {
        return print_out(&format!("{result}\n"));
    }
    let human = human::format_simple_ok(&format!("ensure-gitignore: {result}"));
    let mut body = BTreeMap::new();
    body.insert(
        "ok".into(),
        json!({"op": "ensure-gitignore", "result": result}),
    );
    let body = with_help(body, vec!["repo-journal doctor"]);
    let value = Value::Object(body.into_iter().collect());
    print_value(&value, flags.output_mode(), &human)?;
    Ok(())
}
