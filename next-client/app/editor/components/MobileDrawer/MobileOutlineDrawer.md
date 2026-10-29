# MobileOutlineDrawer

Description: The phone's right drawer: a metrics grid (words, characters, lines, reading time at 200 words a minute) over the note's outline. Its shared `Button` close control uses the `IoClose` glyph. Tapping a heading closes the drawer, puts the caret on that line, scrolls it to the top and flashes it (`flashLine`).

## Local State & Storage
- State: `atom_mobileOutlineOpen` (memory only); reads `atom_activeEditorView` and the active file from `atom_workspaceLayout`.
- The body mounts only while open and reads the note's text once then (the drawer covers the page). Headings come from `useOutlineHeadings`, so a code file lists its symbols.

## Dependencies
- `OverlayPanel`, `useOutlineHeadings`, `countWords`, `flashLine`.
