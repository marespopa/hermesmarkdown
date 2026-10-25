---
state: new
size: normal
kind: feature
blocked_from:
rejections: 0
created: 2026-10-24T15:14:54Z
---

# Query blocks

## Problem
There's no way to gather notes by their metadata inside a note, e.g. a project hub listing every in-progress project.

## Desired behavior
- A fenced code block with the language `query` holds `key: value` lines, e.g.
  ```query
  type: project
  status: in-progress
  ```
  All lines must match (AND). Values match the shared reader's view of each note (plan 002), so tag fallback works too.
- When the caret is outside the block it renders as a live table of matching notes: title, type, status, due date, with the note name opening the note. When the caret enters, the block's text is revealed as typed (same caret-reveal rule as the rest of the editor).
- The table refreshes after vault scans and when matching notes change, including edits made outside HermesMarkdown.
- An empty result shows one quiet line ("No matching notes"); an unknown key or bad line shows the raw text with a muted hint.
- The block stays plain Markdown: other editors see an ordinary code block.
- Export (PDF/compiled download): decide whether the table or the source is exported (see open questions).
- Tests for parsing and matching; docs for the syntax in the user documentation and the Hermes syntax guide.

## Open questions for the architect
- Sorting/limit keys (`sort: due_date`, `limit: 10`) now or later?
- Export: rendered table or source?

## Out of scope
- OR/NOT logic, a query language beyond key: value, editing values from inside the table.
