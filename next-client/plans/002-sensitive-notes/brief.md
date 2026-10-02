---
state: approved
blocked_from:
rejections: 0
created: 2026-10-02T09:56:43Z
---

# Sensitive notes privacy

## Problem
Some notes hold sensitive content (revenue figures, API keys, personal info). Today every
place that shows a note's content excerpt — search / command palette results, link
previews, any list that surfaces a body snippet — leaks that content to anyone looking at
the screen (screen sharing, recording, working in public). There is no way to mark a note
as sensitive or to hide such notes quickly.

## Desired behavior
- **Marking a note sensitive** is local-first, portable, pure Markdown: YAML frontmatter
  `sensitive: true`, or a `sensitive` / `private` entry in frontmatter `tags`.
- **Display factory.** Introduce a single place that decides how a note is shown in any
  listing/preview: e.g. `NoteDisplayFactory.createFeedItem(note, privacyLevel)` (or a pure
  function with the same role) returning a display DTO `{ id, title, preview, isSensitive,
  isMasked }`, or `null` when the note must be excluded. Every listing/preview surface goes
  through it instead of slicing content itself.
- **Privacy levels** (global "Privacy Mode", persisted setting, Jotai atom in `app/atoms/`):
  - `show_title` (default): sensitive notes keep their title, get a subtle privacy/lock
    badge, and their body preview is replaced by a masked bullet string (••••).
  - `hidden`: sensitive notes are stripped from listings/search results entirely (for
    screen sharing / recording).
  - `blurred` (optional): preview rendered but visually blurred, revealed on intent.
- A derived atom combines the notes source + privacy level so UI consumers just read
  display items.
- **Editor interaction:** opening a sensitive note requires an intentional click to reveal
  its content, or a session-level reveal toggle (not persisted across reloads).
- Untitled sensitive notes fall back to a generic title (e.g. filename / "Untitled
  sensitive note"), never to a body excerpt.
- Privacy Mode is reachable from settings and the command palette.

Note for the architect: the user's brief sketched code (Note type, NoteDisplayFactory
class, feedNotesAtom, NoteCard). Treat it as a shape suggestion and adapt it to the
existing codebase — existing surfaces, atoms, components, design tokens. The app has no
sidebar; use file tree / Explorer naming.

## Out of scope
- Encryption of sensitive notes on disk.
- Passwords / authentication to reveal a note.
- Hiding sensitive files' names in the file tree beyond what `hidden` mode specifies.
