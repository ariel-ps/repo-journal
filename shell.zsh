# Source this file from zsh to load this plugin's commands.
typeset -g _REPO_JOURNAL_ROOT="${0:A:h}"
typeset -U path
path=("$_REPO_JOURNAL_ROOT/bin" $path)
export REPO_JOURNAL_CLI="$_REPO_JOURNAL_ROOT/bin/repo-journal"

if [[ -r "$_REPO_JOURNAL_ROOT/completions/repo-journal.zsh" ]]; then
  source "$_REPO_JOURNAL_ROOT/completions/repo-journal.zsh"
fi
