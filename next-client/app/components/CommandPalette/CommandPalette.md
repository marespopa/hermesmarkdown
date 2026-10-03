# CommandPalette

Description: Unified quick-open and command surface (`Ctrl/Cmd+K` or `Ctrl/Cmd+P` for files, `Ctrl/Cmd+Shift+K` or `Ctrl/Cmd+Shift+P` for commands; combos with Alt are left to other shortcuts, so `Ctrl/Cmd+Alt+P` only toggles Edit / Preview). `Ctrl/Cmd+D` pins the selected row; `Tab` / `Shift+Tab` move the selection. It also contributes its own `Open Explorer` command (`Ctrl/Cmd+Shift+E`). `CommandPaletteProvider` owns registration and `AppCommands` registers global commands.

## Local State & Storage
- State: `useCommandPalette()` context (isOpen, commands, register, createNote/setCreateNote). Atoms: `atom_palettePinnedItems`, `atom_recentFilePaths`, `atom_commandUseCounts`, `atom_recentCommandIds`, `atom_fileMetadata` and `atom_noteDisplayItems` (via `usePaletteFiles`), `atom_visibleTasks`, `atom_theme`, `atom_activeEditorView` (heading jumps), `atom_showHiddenFiles`, `atom_editorFontFamily`.
- Persistence: `localStorage` keys `palettePinnedItems` (max 5), `recentFilePaths`, `commandUseCounts`, `recentCommandIds`.
- Query prefixes: none = files, `#` tags, `>` commands, `!` tasks, `@` headings, `/` note text. Ranking happens client-side in `command-search.ts`, except `/`, which runs in the metadata worker.
- Note text (`/`, also `Ctrl/Cmd+Shift+F`): `usePaletteContentSearch` debounces 150 ms and calls `searchNoteContent(query, paths)` (`app/services/content-search-client.ts`); `paths` are the palette's `files` minus sensitive ones, so `_` paths follow the hidden-files setting and "hidden" Privacy Mode notes are excluded too. Superseded responses are dropped and the previous rows stay until the new ones arrive. Matching: case-insensitive, every term must occur in the body (AND, plain substrings), frontmatter skipped, code included, 2-character minimum ("Type at least 2 characters to search note text."). Ranking (`app/workers/content-search.ts`): per line +100 per term, +500 for the whole phrase, +30 per term starting a word, +50 for headings; per note the best line, +1000 for the phrase anywhere, +200 for a term in the file name, +5 per occurrence (max 10). At most 3 rows per note, grouped by note. Each row (`PaletteRow`) shows the highlighted snippet, then `name:line` and the folder. Choosing one mirrors the file branch (close, `nextPaint()`, `openFile`, recents, `/editor` from elsewhere) and sets `atom_pendingScrollTarget` `{ path, line, column }`; `useScrollToPendingTarget` puts the caret on the first match and flashes the line, also when the note is already active. Pinning and the context menu don't apply. Sensitive notes never match in any Privacy Mode (a masked row would still reveal that the note contains the phrase); the worker refuses them too. A muted footnote under the list reads "Indexing note text… N notes left" while notes are still being indexed (the hook searches again every second meanwhile), or "Note text search covers part of this vault (size limit reached)."; without a worker the scope says "Note text search isn't available in this browser." The palette also mounts `useContentIndexSync()`, which drops deleted notes from the index.
- Layout: the search field is a pill (`PaletteSearchBar`, sharing `SEARCH_PILL_CLASS` & co. from `palette-model` with the home feed's pill); after the ⌘K hint, `>` toggles command mode on and off. Theme and Settings sit in the footer beside the version; documentation is the **Open Documentation** command and the help button in the pane header.
- Search anchor morph: when an element with `data-palette-anchor` is on screen (the home feed's search pill), `open`/`close` run inside a View Transition. The anchor and the palette's search field share the `palette-search` transition name (`PALETTE_SEARCH_TRANSITION`), so one morphs into the other; timings live in `globals.scss`. The transition waits for the palette field (`[data-palette-field]`) to mount or unmount (it renders through a Portal), and while `isMorphing` (set for the whole of a morphed open, not just the transition, so the fade-in never replays afterwards) the panel skips its own enter/exit animations and exit delay so the morph stays visible. Without View Transitions support, or with reduced motion, the palette just opens. With a create handler registered, the placeholder reads "Search or create a note…" (`SEARCH_OR_CREATE_PLACEHOLDER`), matching the pill.
- Create row: when the file query has no note with exactly that title (case-insensitive), the last row is `Create "<query>"`. It calls the `createNote` handler that the editor registers through `setCreateNote` while a vault is open; the handler saves a new note titled with the query and opens it.
- Sensitive notes: `usePaletteFiles` (`use-palette-files.ts`) builds the file list through `atom_noteDisplayItems`, so each `FileResult` has `isSensitive` (a `SensitiveBadge` lock follows the row label, and the accessible name adds "(sensitive)"), and Privacy Mode "hidden" drops sensitive notes from search, `#tag`, recent and pinned rows. Stored pins and recents are untouched, so they come back when the mode changes. The Create row checks `existingFiles` (ignoring Privacy Mode), so it never offers a hidden note's existing title. `!` tasks come from `atom_visibleTasks` through `buildTaskRows`: a masked task shows `MASKED_TEXT` with a lock and `path:line`, only for the empty query, and never matches by text; in "hidden" it's omitted.
- Choosing a file closes the palette first (after `nextPaint()`), then calls `openFile`; the editor's `LoadingBar` covers the read and re-render. Long-running commands keep the palette open and show a spinner on their row (`aria-busy`).

## Dependencies
- Core: `OverlayPanel`, `Button`, `useFileSystem`, `@codemirror/view` (for heading jumps), `react-icons`.
- Content search: `usePaletteContentSearch`, `useContentIndexSync`, `PaletteRow`, `atom_pendingScrollTarget`.
- Zero-Cloud: No network or telemetry side effects. All search runs in memory; note-text search runs in the metadata worker.

## Quick Usage
```tsx
import { useRegisterCommand } from "@/app/components/CommandPalette/CommandPaletteContext";

useRegisterCommand({ id: "doc.export", label: "Export", category: "Document", action: exportDoc });
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | `CommandPalette`/`AppCommands` take no props |
| children | `ReactNode` |  | `CommandPaletteProvider` |

`Command` fields: `id` (stable, unique), `label`, `action`, `category?`, `shortcut?`, `description?`, `keywords?`, `disabledReason?`, `danger?`, `closeOnRun?`.
