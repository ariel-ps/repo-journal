# Source this file from bash to load this plugin's commands.
_repo_journal_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
case ":$PATH:" in
  *":$_repo_journal_root/bin:"*) ;;
  *) PATH="$_repo_journal_root/bin:$PATH" ;;
esac
unset _repo_journal_root
