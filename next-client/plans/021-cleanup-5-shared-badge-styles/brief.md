---
state: approved
size: normal
kind: feature
blocked_from:
rejections: 0
created: 2026-10-23T06:46:14Z
---

# Cleanup: (5) Shared badge styles — CountBadge (app/components/CountBad

## Desired behavior
Cleanup: (5) Shared badge styles — CountBadge (app/components/CountBadge) is used in Tasks, Tags and WordCountPill but not in the sidebar file tree or the command palette; audit file counts, character/word counts and tag pills across the sidebar, palette and editor and make them use one shared component/style. (6) Timing cleanup — move layout motion (sidebar toggles, drawers, pane splits) still using stray duration-200/300/500 and transition-all onto the shared duration-layout ease-layout tokens (--layout-duration 150ms); keep non-layout animations (toasts, pulses, hero, spinners) as they are. Respect the flat minimal design token rules.

## Out of scope
Anything the request doesn't ask for.
