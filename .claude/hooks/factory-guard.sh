#!/usr/bin/env bash
# PreToolUse guard for factory runs (scripts/factory sets HERMES_FACTORY=1).
# Agents in the factory never publish: block git commands that move HEAD,
# rewrite history, switch branches or touch remotes. No-op outside the factory.
[ "${HERMES_FACTORY:-}" = "1" ] || exit 0

input=$(cat)
if printf '%s' "$input" | grep -Eq '(^|[^[:alnum:]_-])git([[:space:]]+-[^[:space:]]+([[:space:]]+[^-[:space:]][^[:space:]]*)?)*[[:space:]]+(commit|push|reset|checkout|switch|rebase|stash|branch|worktree|merge|cherry-pick|revert|tag|am|pull)([^[:alnum:]-]|$)'; then
  echo "Factory rail: agents must not commit, push, or change branches/history. Leave changes in the working tree; the human merges." >&2
  exit 2
fi
exit 0
