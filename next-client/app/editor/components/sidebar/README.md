# sidebar

The parts of `WorkspaceSidebar` (one level up), top to bottom, and what they share. The sidebar is the library (vault, Open Notes, Outline, Linked from, Unlinked mentions, Files) and nothing else; everything else (Settings and Documentation too) is the command palette's.

| Item | Purpose |
|---|---|
| [SidebarHeader](SidebarHeader.md) | Vault switcher, New note, Hide sidebar. |
| [SidebarOpenNotes](SidebarOpenNotes.md) | The focused pane's open notes: one click to switch, × to close, a dot while unsaved. |
| [SidebarOutline](SidebarOutline.md) | The note in front's H1–H3 headings as a tree like Files: carets, each heading's level, the caret's section highlighted; a click jumps there. |
| [LinkedFromSection](LinkedFromSection.md) | Notes linking to the note in front (wikilinks, embeds); a click opens the source at the link. |
| [UnlinkedMentionsSection](UnlinkedMentionsSection.md) | Collapsed by default: notes naming the note in front as plain text, searched in the worker only while open. |
| [SidebarFiles](SidebarFiles.md) | The vault's file tree. |
| [SidebarSection](SidebarSection.md) | A collapsible group set apart by a full-width hairline, its chevron always shown, with an optional ⋯ menu. |
| `sidebar-classes.ts` | The quiet look every part uses: 28px rows in the primary text colour, neutral grey icons (`SIDEBAR_ICON_CLASS`), the current row on a soft accent fill (`SIDEBAR_ACCENT_FILL`, the file tree's active-row fill), quiet icon buttons. |
| `use-sidebar-navigation.ts` | Opening a tree row or an open note, and New note, from any /editor route: in place on the editor, else back to it at the note's URL. |
