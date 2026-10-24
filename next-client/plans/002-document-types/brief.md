---
state: new
size: normal
kind: feature
blocked_from:
rejections: 0
created: 2026-10-24T15:14:54Z
---

# Document types

## Problem
Notes have no notion of what kind of thing they are (project, task, meeting), so nothing can show, list or gather them by kind.

## Desired behavior
- A `type:` frontmatter key names the note's type. Built-in types: `project`, `task`, `meeting`, `bookmark`; any other value is a custom type shown as its name.
- `/type` in the slash menu, and a palette command "Set Type…", open a picker of types. Choosing one inserts the frontmatter block if missing, or updates `type:` in place, and adds that type's default keys only when absent (e.g. project/task: `status`, `due_date`). The body is never touched. One undoable change.
- Tag fallback: `#type/project` or `#status/active` in `tags:` or inline in the body is read as the same `type`/`status` by everything that reads types (header, board, queries). The file text is not rewritten.
- The frontmatter header (plan 001) shows the type as its first chip; clicking it opens the same picker.
- One shared reader (in app/utils, beside frontmatter-utils) gives each note's type, status and dates, from YAML first, then tags; plans 003 and 004 use it.
- Notes edited outside HermesMarkdown are re-read when the vault is next scanned or the file is focused again.
- Tests for the reader (YAML, tags, both, conflicting values) and the picker's text edits.

## Open questions for the architect
- Sidebar: the brief asked for per-type file icons and virtual "Projects (3) / Tasks (12)" groups. The sidebar was just simplified to Pinned and Files (2026-10-24). Should type show in the sidebar at all — e.g. a small icon in the Files list only, or Search accepting `type:project` — or not in this plan?
- When YAML and tags disagree, YAML wins?

## Out of scope
- Per-type schemas with validation or required fields.
- Type-specific colours or emoji.

## Already decided / built (2026-10-24)
- Sidebar: no virtual type groups. The Files tree shows a type icon per note (`vault-tree/FileIcon`): project, task, meeting, bookmark.
- `app/utils/note-type.ts` (`noteTypeOf`: frontmatter `type:`, else a `type/…` tag; frontmatter wins) is the start of the shared reader; extend it with status and dates rather than adding a second one.
