# Source this file from bash to load this plugin's commands.
_herdr_journal_root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
case ":$PATH:" in
  *":$_herdr_journal_root/bin:"*) ;;
  *) PATH="$_herdr_journal_root/bin:$PATH" ;;
esac
unset _herdr_journal_root
