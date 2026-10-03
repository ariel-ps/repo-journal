# Source this file from zsh to load this plugin's commands.
typeset -g _JOURNAL_REPO_ROOT="${0:A:h}"
typeset -U path
path=("$_JOURNAL_REPO_ROOT/bin" $path)
export JOURNAL_REPO_CLI="$_JOURNAL_REPO_ROOT/bin/journal-repo"

if ! command -v treehouse >/dev/null 2>&1; then
  echo "journal-repo: treehouse is required on PATH (https://github.com/kunchenguid/treehouse)" >&2
fi

if [[ -r "$_JOURNAL_REPO_ROOT/completions/journal-repo.zsh" ]]; then
  source "$_JOURNAL_REPO_ROOT/completions/journal-repo.zsh"
fi
