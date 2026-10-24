# EditorSkeleton

Description: An outline of what the editor will show, shown full screen by [VaultAccessGate](VaultAccessGate.md) while the saved vault loads — while it's looked up (`atom_isVaultRestoring`), behind the "Vault Access Paused" prompt, and after access is granted until the vault is readable. On an /editor sub-page (`usePathname`: Templates, Tasks, All Files, Trash, Tags, Settings) it outlines that page instead ([RouteSkeletons](RouteSkeletons.md)). Otherwise it outlines the editor, which is where every visit lands (there is no home screen): the sidebar on desktop when `atom_sidebarOpen` (at `atom_sidebarWidth`; a plain chrome panel with a hairline edge, a plain hide button, and two sections, Outline and Files), the pane on the plain page beside it, the pane's title at its top left (no toolbar), the `SearchPill`'s shape in the top-right corner (desktop, `SearchPillSkeleton` at `SEARCH_PILL_WIDTH`, where EditorShell puts the real one), and the note's text column (`.editor-canvas`, `.editor-sheet`, borderless on the page; with `data-full-width` when `atom_fullWidth` is on, so the lines fill the sheet as the real column does) with a title bar and three paragraphs of placeholder lines. It mirrors the real layout's classes so the editor appears in place with no jump. Its note sheet is exported as `NoteSheetSkeleton`, which `PaneLeaf` shows as the body of a note being opened.

## Local State & Storage
- State: Reads `atom_sidebarOpen` and `atom_sidebarWidth`.
- Persistence: None itself (both atoms persist in `localStorage`).

## Dependencies
- Core: `jotai`, `RouteSkeletons` (`SearchPillSkeleton`), `SearchPill` (`SEARCH_PILL_WIDTH`), `pane-header-classes.ts`, `editor.scss` (`.editor-canvas`, `.editor-sheet`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import EditorSkeleton from "./EditorSkeleton";

if (isVaultRestoring) return <EditorSkeleton />;
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
