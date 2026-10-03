#compdef repo-journal
# Zsh completion for repo-journal. Sourced from shell.zsh when compdef is available.

_repo_journal_slugs() {
  local -a slugs
  local bin="${REPO_JOURNAL_CLI:-repo-journal}"
  slugs=("${(@f)$($=bin complete slugs 2>/dev/null)}")
  if (( ${#slugs} )); then
    _describe 'journal slug' slugs
  fi
}

_repo_journal_options() {
  local cmd=$1
  case $cmd in
    show)
      _values 'option' --plain --json --toon --full -h --help -v --version
      ;;
    list)
      _values 'option' --plain --json --toon --all -a -h --help -v --version
      ;;
    *)
      _values 'option' --plain --json --toon -h --help -v --version
      ;;
  esac
}

_repo_journal() {
  local cmd="" cmd_idx=0 i

  for (( i = 2; i < CURRENT; i++ )); do
    [[ ${words[i]} == -* ]] && continue
    cmd=${words[i]}
    cmd_idx=$i
    break
  done

  if [[ ${words[CURRENT]} == -* ]] || (( CURRENT == 2 && ${words[2]:0:1} == '-' )); then
    _repo_journal_options "$cmd"
    return
  fi

  if (( CURRENT == 2 )); then
    _values 'command' \
      dashboard new add list show path root doctor ensure-gitignore complete
    return
  fi

  case $cmd in
    show|add)
      if (( CURRENT == cmd_idx + 1 )); then
        _repo_journal_slugs
      fi
      ;;
    complete)
      if (( CURRENT == cmd_idx + 1 )); then
        _values 'target' slugs
      fi
      ;;
  esac
}

if (( $+functions[compdef] )); then
  compdef _repo_journal repo-journal
fi
