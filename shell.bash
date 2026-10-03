# Source this file from bash to load this plugin's commands.
_repo_journal_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
case ":$PATH:" in
  *":$_repo_journal_root/bin:"*) ;;
  *) PATH="$_repo_journal_root/bin:$PATH" ;;
esac
export REPO_JOURNAL_CLI="$_repo_journal_root/bin/repo-journal"

if ! command -v treehouse >/dev/null 2>&1; then
  echo "repo-journal: treehouse is required on PATH (https://github.com/kunchenguid/treehouse)" >&2
fi

if [[ -r "$_repo_journal_root/completions/repo-journal.bash" ]]; then
  # shellcheck source=completions/repo-journal.bash
  source "$_repo_journal_root/completions/repo-journal.bash"
fi
unset _repo_journal_root
