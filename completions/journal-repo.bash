# Bash completion for journal-repo. Sourced from shell.bash when available.

_journal_repo_slugs() {
  local bin="${JOURNAL_REPO_CLI:-journal-repo}"
  "$bin" complete slugs 2>/dev/null
}

_journal_repo() {
  local cur prev words cword
  _init_completion -n : || return

  local cmd="" i w
  for (( i = 1; i < cword; i++ )); do
    w="${words[i]}"
    [[ $w == -* ]] && continue
    cmd=$w
    break
  done

  local global_opts="--plain --json --toon -h --help -v --version"
  local commands="dashboard new add attach files list show path root doctor ensure-gitignore complete treehouse"

  if [[ $cur == -* ]]; then
    case $cmd in
      show)
        COMPREPLY=( $(compgen -W "$global_opts --full --with-files" -- "$cur") )
        ;;
      list)
        COMPREPLY=( $(compgen -W "$global_opts --all -a" -- "$cur") )
        ;;
      attach)
        COMPREPLY=( $(compgen -W "$global_opts --as" -- "$cur") )
        ;;
      complete)
        COMPREPLY=( $(compgen -W "$global_opts slugs" -- "$cur") )
        ;;
      *)
        COMPREPLY=( $(compgen -W "$global_opts" -- "$cur") )
        ;;
    esac
    return
  fi

  if [[ -z $cmd || $cword -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
    return
  fi

  case $cmd in
    show|add|attach|files)
      if [[ $prev == "$cmd" ]]; then
        local slugs
        slugs=$(_journal_repo_slugs)
        COMPREPLY=( $(compgen -W "$slugs" -- "$cur") )
      fi
      ;;
    complete)
      if [[ $prev == complete ]]; then
        COMPREPLY=( $(compgen -W "slugs" -- "$cur") )
      fi
      ;;
    new|list|dashboard|path|root|doctor|ensure-gitignore|treehouse)
      ;;
  esac
}

if [[ -n ${BASH_VERSION:-} ]]; then
  complete -F _journal_repo journal-repo
fi
