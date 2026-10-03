# Source this file from bash to load this plugin's commands.
_journal_repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
case ":$PATH:" in
  *":$_journal_repo_root/bin:"*) ;;
  *) PATH="$_journal_repo_root/bin:$PATH" ;;
esac
export JOURNAL_REPO_CLI="$_journal_repo_root/bin/journal-repo"

if ! command -v treehouse >/dev/null 2>&1; then
  echo "journal-repo: treehouse is required on PATH (https://github.com/kunchenguid/treehouse)" >&2
fi

if [[ -r "$_journal_repo_root/completions/journal-repo.bash" ]]; then
  # shellcheck source=completions/journal-repo.bash
  source "$_journal_repo_root/completions/journal-repo.bash"
fi
unset _journal_repo_root
