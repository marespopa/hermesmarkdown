---
state: new
size: normal
kind: feature
blocked_from:
rejections: 0
created: 2026-10-24T15:14:54Z
---

# Frontmatter header

## Problem
A note's YAML frontmatter is shown as typed on a tinted panel (codemirror/frontmatter-block.ts). It's useful metadata but reads as code above the writing, and changing a `status` or a date means editing YAML by hand.

## Desired behavior
- When the caret is outside the frontmatter, the block shows as one quiet line of chips above the note's first line: the `type` value first, then tags (`#tag`), `status`, dates (`due_date`, `date`, any ISO date value shown short, e.g. "Nov 15"), then other scalar keys. Muted text at the body size, a flat background from the existing tokens, no emoji, no colour for status, no blur.
- When the caret or selection enters the block (by arrow keys, clicking the line, or Undo), the raw YAML is revealed exactly as typed, like the existing caret-line reveal of markdown marks. The reveal may add width but must not change the weight or line height.
- `status` chip: click opens a small menu of the known statuses (see open questions) plus the current value; choosing one rewrites only that value in the YAML text, as one undoable change.
- Date chips: click opens a date picker; choosing a date writes `YYYY-MM-DD`.
- Other chips: click puts the caret on that key's line (revealing the YAML).
- Folding keeps working as it does today (the folded summary covers the "compact" case).
- Files edited outside HermesMarkdown: the chips follow whatever is on disk (disk content wins), no prompts.
- Keyboard: chips are reachable and editable from the keyboard; no new global shortcut.
- Docs: user docs (get-started / editor docs), component .md files, DESIGN.md if a new token is needed.

## Open questions for the architect
- Status values: WORKFLOW_TAGS today is draft/review/active/archived; the brief that started this used todo/in-progress/done. One list, or both? - use both
- Malformed YAML or nested values (lists of objects): fall back to showing the raw YAML? - show raw

## Out of scope
- A raw-mode toggle, Cmd/Ctrl+Shift+Y, a `---` icon, or a setting with three rendering modes (the caret reveal replaces them).
- Fading the chips while typing.
- Document types and the `/type` picker (plan 003).
