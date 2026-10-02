# Source this file from zsh to load this plugin's commands.
typeset -g _HERDR_JOURNAL_ROOT="${0:A:h}"
typeset -U path
path=("$_HERDR_JOURNAL_ROOT/bin" $path)
