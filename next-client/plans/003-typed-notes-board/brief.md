---
state: new
size: normal
kind: feature
blocked_from:
rejections: 0
created: 2026-10-24T15:14:54Z
---

# Typed notes on the board

## Problem
The Tasks page's Board view groups checkbox tasks by status, but notes that are themselves a project or a task (`type: project` / `type: task`, plan 002) don't appear anywhere as work items.

## Desired behavior
- The Tasks Board shows notes whose type is `project` or `task` as cards, in the column matching their `status` (via the shared reader from plan 002). Notes without a status go in the first column.
- A card shows the note's title (first H1 or file name), its type, and its due date; clicking opens the note.
- Moving a card to another column rewrites only that note's `status:` value on disk, as the frontmatter header does.
- Edits made outside HermesMarkdown show up on the next vault scan or when the page is reopened.
- A way to tell note cards from checkbox-task cards that fits the existing flat card style.

## Open questions for the architect
- Columns: reuse the board's current status columns, and how do note statuses map onto them (same question as plan 001's status list)?
- Should note cards be a filter toggle on the board, or always shown?

## Out of scope
- A separate Kanban page; new board types.
