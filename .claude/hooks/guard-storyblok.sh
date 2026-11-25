#!/usr/bin/env bash
# PreToolUse(Bash): Storyblok writes run only after the user approves them.
# Reads (pull, types generate, user) pass through.
c=$(jq -r '.tool_input.command // empty')
printf '%s' "$c" | grep -Eq 'storyblok[^;&|]* push|setup:space|setup-space\.mjs' || exit 0

reason='writes to a Storyblok space'
# Development-plan spaces allow three publishes a day, and a push publishes every story it touches.
printf '%s' "$c" | grep -Eq -- '--publish' && reason="$reason and PUBLISHES every pushed story (dev spaces: 3 publishes a day)"

jq -n --arg r "Storyblok: this $reason -- needs explicit approval" \
  '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: $r}}'
