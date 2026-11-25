#!/usr/bin/env bash
# PreToolUse(Bash): pushes to main/master, force-pushes and remote-branch
# deletes still run, but only after the user approves them in a permission
# prompt -- even in permissive modes. Any other command passes through.
# Known gap: "pushes from main" checks this repo's branch, not a `git -C <dir>`
# target's; an explicit refspec to main is caught either way.
c=$(jq -r '.tool_input.command // empty')
printf '%s' "$c" | grep -Eq '(^|[;&|(]|[[:space:]])git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push' || exit 0

reason=
if printf '%s' "$c" | grep -Eq -- '--force|--mirror|[[:space:]]-[a-zA-Z]*f[a-zA-Z]*([[:space:]]|$)|[[:space:]]\+[^[:space:]]'; then
  reason='force-push'
elif printf '%s' "$c" | grep -Eq -- '--delete|[[:space:]]-d([[:space:]]|$)|[[:space:]]:[^[:space:]]'; then
  reason='deletes a remote branch'
elif printf '%s' "$c" | grep -Eq '(^|[[:space:]:])(main|master)([[:space:]]|$)'; then
  reason='pushes to main'
elif git rev-parse --abbrev-ref HEAD 2>/dev/null | grep -Eqx 'main|master'; then
  reason='pushes from main'
fi
[ -z "$reason" ] && exit 0

jq -n --arg r "git push $reason -- needs explicit approval" \
  '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: $r}}'
