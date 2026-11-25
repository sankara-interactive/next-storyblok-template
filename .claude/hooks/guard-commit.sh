#!/usr/bin/env bash
# PreToolUse(Bash): refuse `git commit` on main/master. Checks the repo the
# commit targets (`git -C <dir>` or a preceding `cd <dir>`), not just this one.
c=$(jq -r '.tool_input.command // empty')
printf '%s' "$c" | grep -Eq 'git +(-C +[^ ]+ +)?commit' || exit 0
before=${c%%commit*}
# A branch created earlier in the same command is where the commit lands.
printf '%s' "$before" | grep -Eq 'git +(checkout|switch) +[^;&|]*-[bBcC]' && exit 0

dir=$(printf '%s' "$before" | grep -oE 'git +-C +[^ ]+' | tail -1 | sed -E 's/git +-C +//')
[ -z "$dir" ] && dir=$(printf '%s' "$before" | grep -oE '(^|[;&|] *)cd +[^ ;&|]+' | tail -1 | sed -E 's/.*cd +//')
dir=$(printf '%s' "${dir:-.}" | tr -d "\"'")
dir=${dir/#\~/$HOME}

branch=$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null) || branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
case "$branch" in
  main | master)
    echo 'Refusing to commit on main; use a feature branch' >&2
    exit 2
    ;;
esac
exit 0
