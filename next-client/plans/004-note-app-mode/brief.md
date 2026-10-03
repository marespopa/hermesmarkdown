---
state: new
blocked_from:
rejections: 0
created: 2026-10-03T17:02:08Z
---

# Note-app mode: hide the IDE until needed

## Problem
HermesMarkdown should feel like a note app or journal, but its main path still looks like a code editor: a tab strip, split panes and a splitter, a sidebar built around a file tree with `.md` filenames, and filenames shown in tabs and headers ("Untitled", `2026-10-03 notes.md`). People who write notes and journals have to think about files, tabs and layout before they can write. The writing surface (the paper sheet, the home feed greeting and day labels, flow mode) is already calm; the chrome around it is not.

## Desired behavior

### (a) Single-note mode is the default
- One note on screen at a time. No tab strip, no split panes, no splitter.
- Opening a note (from the home feed, sidebar, palette, wikilink) replaces the current note instead of adding a tab. Unsaved changes must never be lost when a note is replaced (autosave or keep the draft, matching current save behavior).
- Back/forward between recently viewed notes (keyboard and browser history) stands in for tabs.
- Tabs and panes become an opt-in setting: Settings → Appearance → **Workspace layout**: "Single note" (default) / "Tabs & panes". Switching to Tabs & panes restores today's behavior exactly; switching back keeps the active note.
- Commands that only make sense with panes (split, move tab to pane, close other tabs, …) are hidden in single-note mode, not disabled.
- Decide how existing users are migrated (likely: users with a saved multi-tab/multi-pane layout keep "Tabs & panes"; new users get "Single note").

### (b) The sidebar lists notes, not files
- The desktop `WorkspaceSidebar` (navigation only; added back 2026-10-03) lists:
  - **Home** (as today)
  - **Pinned** notes (pin/unpin from the note's menu, sidebar context menu and a command; persisted per vault)
  - **Recent** notes by title with a short date (Today / Yesterday / weekday / short date — reuse the home feed's day labels)
  - **Smart folders** (existing saved queries, `SmartFolders` / `atom_customWorkspaces`)
- "Open Notes" (the tab list) only shows in Tabs & panes mode.
- The file tree is removed from the sidebar's default view and lives in Explorer (`/editor/files`); the sidebar has a link to Explorer.
- Sensitive notes follow Privacy Mode like every other listing (go through `atom_noteDisplayItems`).
- Mobile (`MobileFileOverlay`) gets the same Pinned / Recent structure where it fits.

### (c) No filenames in the main path
- Everywhere a note is named in the main UI (header above the sheet, sidebar, palette rows, home feed, window title), show its **title**: the frontmatter `title`, else the first H1, else the first non-empty line (trimmed), else the date it was created. Never ".md", never "Untitled".
- New notes are named automatically: no filename prompt. The file gets a name from its title on first save (slugified, unique via the existing unique-file helpers), or a date-based name if empty.
- Optional (setting, default off): when the H1 changes, rename the file in the background after a quiet period. Wikilinks and open state must follow the rename (existing `atom_remapVaultPaths`), and it must never fight the file watcher or rename a file that isn't the active one.
- Filenames stay visible in Explorer and in a "Show file info" / properties spot, for people who care.

## Out of scope
- Daily notes / journal features (Today's entry, calendar, "On this day", quick capture, journal typography).
- Changes to the editor sheet or the home feed beyond using titles instead of filenames.
- Removing the tabs/panes code; it stays as the opt-in mode.

## Project constraints to respect
- Disk content wins over cached tab text; no overwrite prompts.
- No "rail" naming for the sidebar; navigation-only sidebar, commands stay in the toolbar.
- Source files under 400 lines; every component keeps a sibling `.md` doc; tests mock `useFileSystem`.
