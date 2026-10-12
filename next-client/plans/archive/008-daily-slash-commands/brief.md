---
state: merged
blocked_from: 
rejections: 0
created: 2026-10-11T18:31:09Z
---

# Daily slash commands

Part of the review ladder (`plans/review-ladder.md`), level 1: Daily captures.

## Problem
Daily capture is already mostly there: **Today's sheet** (6.4.0) and **Quick jot** (#98) both come from the palette or a shortcut. But the slash menu, where people already go to type `/task`, `/code` or `/table`, has nothing for the worklog. If you're halfway through a line in some note and decide it belongs in today's log, you have to leave the slash menu habit and remember another shortcut. "Open the editor, type `/daily`" should be the zero-friction entry point.

## Desired behavior
- **`/daily`** in the slash menu opens today's sheet. If it doesn't exist yet, it's created exactly as **Today's sheet** creates it: same Daily Sheets Folder setting, same Journal/Daily template, same first-time folder prompt. The trigger text (`/daily`) is removed from the note you typed it in, and that note isn't otherwise changed.
- **`/jot`** sends text to the end of today's sheet without leaving the current note, using Quick jot's append rules (own line, `- ` list item unless it already starts with list or task syntax, live update if the sheet is open, buffered changes respected):
  - With a selection, the selected text is sent. A multi-line selection (for example a code fence or a list of workout sets) is appended as one block, not one list item per line. Code fences and tables are kept as typed.
  - Without a selection, the current line minus `/jot` is sent and then removed from the current note. The architect decides whether it's moved (removed) or copied (kept), and says why.
  - Same quiet confirmation as Quick jot ("Added to 2026-10-11", with a way to open the sheet).
- Optional, architect's call: `/week` and `/month` as slash shortcuts to **This week's sheet** / **This month's sheet**. Skip them if they crowd the menu.
- With no vault open, the entries are hidden (as the vault Template entry is), not shown disabled.
- Keyboard-only: no mouse needed from `/` to back in the note. Works on touch through the slash menu.
- Docs: Quick jot / Daily docs and the slash menu list.

## Out of scope
- Sending to a note other than today's sheet, or under a specific heading.
- Changing Quick jot's single-line input.
- User-defined slash commands.
