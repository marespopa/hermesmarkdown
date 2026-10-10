---
state: approved
blocked_from:
rejections: 0
created: 2026-10-10T07:10:14Z
---

# Quick jot to today's sheet

## Problem
HermesMarkdown is a daily worklog: the day's notes go into today's sheet (`<date>.md`, shipped in 6.4.0). But while you're working in another note, logging a thought ("called the vendor", "deploy done 14:20") means leaving that note, opening today's sheet, scrolling to the end, typing, and coming back. That friction is why entries don't get logged. The product vision (2026-10-03) names quick capture as a core feature, and nothing for it exists yet: no jot code, command or shortcut.

## Desired behavior
- From anywhere in the editor (any note, the draft, the home feed), a shortcut or the palette command **Quick jot** opens a small one-line input over the current view. The current note, its scroll position and its cursor stay where they are.
- Type a line and press Enter: the line is appended to the end of today's sheet, and the input closes. Escape closes it without writing.
- If today's sheet doesn't exist yet, it is created first, exactly as **Today's sheet** creates it in 6.4.0: same folder setting (Settings → Files → Daily Sheets Folder, `{{year}}` / `{{month}}`), same Journal/Daily template, and the same first-time folder prompt when the folder was never chosen.
- An appended line starts on its own line, never glued to the last line of the sheet. Plain text becomes a list item (`- text`); text that already starts with list or task syntax (`- `, `- [ ] `, `* `, `1. `) is kept as typed, so `- [ ] call back` adds an open task. It's worth considering a time prefix (e.g. `14:20`) as an option.
- If today's sheet is open in a tab or pane, it updates live, with nothing lost and no conflict prompt. If it has unsaved changes there, the jot lands in that buffer and is saved with it, without overwriting those changes from disk.
- A quiet confirmation ("Added to 2026-10-10") with a way to open the sheet.
- With no vault open there is no today's sheet: the command is disabled with a reason, or the jot goes to the draft. The architect decides which.
- **Shortcut:** the idea was Cmd/Ctrl+Shift+J. Ctrl+Shift+J opens DevTools in Chrome on Windows and Linux, and a page can't override it. Pick a shortcut that works in Chrome, Edge, Firefox and Safari on all three OSes (Mac, Windows, Linux), check it doesn't clash with existing app shortcuts, and register it in the palette and the keyboard shortcuts list. The input must also be usable on touch devices (tablet, no keyboard shortcut) via the palette or a visible entry point.
- Docs: the user documentation and the keyboard shortcuts list.

## Out of scope
- Jotting into notes other than today's sheet (choosing a target note).
- Placing a jot under a specific heading or section of the sheet; it always goes at the end.
- Multi-line input, attachments, voice capture.
- A global OS-level shortcut (outside the browser tab).
