# CopyContentButton

Description: Copies the active pane's file as it is (a note's Markdown, a code file's source) to the clipboard — the palette's **Copy Contents**, one click away. On the editor (`/editor`, desktop) it sits just left of the `SearchPill` in the window's top-right corner (`EditorShell`), in the pill's look: the same height, tint and rounding, with a copy icon and a "Copy Contents" tooltip. A toast says whether it worked (`copyContentToClipboard`, shared with the palette command and the pane menus via `usePaneFileActions`). It is disabled while the active pane has no note open, or the note is empty. `OutlineToggleButton` sits to its left. `EDITOR_CORNER_WIDTH` (the two buttons, their gaps and `SEARCH_PILL_WIDTH`) is exported so the pane's floating title (`PaneLeaf`) and the loading outline (`EditorSkeleton`) keep clear of the corner.

## Local State & Storage
- State: reads `atom_workspaceLayout`, `atom_activePaneId` and the active note's `atom_fileContent`.
- Persistence: None.

## Dependencies
- Core: `Button`, `Tooltip`, `copyContentToClipboard` (`use-pane-file-actions`), `SEARCH_PILL_WIDTH`.
- Zero-Cloud: No network or telemetry side effects; the text goes to the system clipboard only.

## Quick Usage
```tsx
<div className="fixed top-1.5 right-8 z-30 flex items-center gap-1.5">
  <CopyContentButton />
  <SearchPill />
</div>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| className? | `string` | `""` | Extra classes for placement |
