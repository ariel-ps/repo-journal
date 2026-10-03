# Bash completion for repo-journal. Sourced from shell.bash when available.

_repo_journal_slugs() {
  local bin="${REPO_JOURNAL_CLI:-repo-journal}"
  "$bin" complete slugs 2>/dev/null
}

_repo_journal() {
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
  local commands="dashboard new add attach files list show path root doctor ensure-gitignore complete"

  if [[ $cur == -* ]]; then
    case $cmd in
      show)
        COMPREPLY=( $(compgen -W "$global_opts --full --with-files" -- "$cur") )
        ;;
      attach)
        COMPREPLY=( $(compgen -W "$global_opts --as" -- "$cur") )
        ;;
      list)
        COMPREPLY=( $(compgen -W "$global_opts --all -a" -- "$cur") )
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
        slugs=$(_repo_journal_slugs)
        COMPREPLY=( $(compgen -W "$slugs" -- "$cur") )
      fi
      ;;
    complete)
      if [[ $prev == complete ]]; then
        COMPREPLY=( $(compgen -W "slugs" -- "$cur") )
      fi
      ;;
    new|list|dashboard|path|root|doctor|ensure-gitignore)
      ;;
  esac
}

if [[ -n ${BASH_VERSION:-} ]]; then
  complete -F _repo_journal repo-journal
fi
