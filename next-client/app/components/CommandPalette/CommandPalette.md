# CommandPalette

Description: Unified quick-open and command surface (`Ctrl/Cmd+K` or `Ctrl/Cmd+P` for files, `Ctrl/Cmd+Shift+K` or `Ctrl/Cmd+Shift+P` for commands; combos with Alt are left to other shortcuts, so `Ctrl/Cmd+Alt+P` only toggles Edit / Preview). `Ctrl/Cmd+D` pins the selected row; `Tab` / `Shift+Tab` move the selection. It also contributes its own `Open Explorer` command (`Ctrl/Cmd+Shift+E`). `CommandPaletteProvider` owns registration and `AppCommands` registers global commands.

## Local State & Storage
- State: `useCommandPalette()` context (isOpen, commands, register, createNote/setCreateNote). Atoms: `atom_palettePinnedItems`, `atom_recentFilePaths`, `atom_commandUseCounts`, `atom_recentCommandIds`, `atom_fileMetadata`, `atom_allTasks`, `atom_theme`, `atom_activeEditorView` (heading jumps), `atom_showHiddenFiles`, `atom_editorFontFamily`.
- Persistence: `localStorage` keys `palettePinnedItems` (max 5), `recentFilePaths`, `commandUseCounts`, `recentCommandIds`.
- Query prefixes: none = files, `#` tags, `>` commands, `!` tasks, `@` headings. Ranking happens client-side in `command-search.ts`.
- Layout: the search field is a pill (`PaletteSearchBar`, sharing `SEARCH_PILL_CLASS` & co. from `palette-model` with the home feed's pill); after the ⌘K hint, `>` toggles command mode on and off. Theme and Settings sit in the footer beside the version; documentation is the **Open Documentation** command and the help button in the pane header.
- Search anchor morph: when an element with `data-palette-anchor` is on screen (the home feed's search pill), `open`/`close` run inside a View Transition. The anchor and the palette's search field share the `palette-search` transition name (`PALETTE_SEARCH_TRANSITION`), so one morphs into the other; timings live in `globals.scss`. The transition waits for the palette field (`[data-palette-field]`) to mount or unmount (it renders through a Portal), and while `isMorphing` (set for the whole of a morphed open, not just the transition, so the fade-in never replays afterwards) the panel skips its own enter/exit animations and exit delay so the morph stays visible. Without View Transitions support, or with reduced motion, the palette just opens. With a create handler registered, the placeholder reads "Search or create a note…" (`SEARCH_OR_CREATE_PLACEHOLDER`), matching the pill.
- Create row: when the file query has no note with exactly that title (case-insensitive), the last row is `Create "<query>"`. It calls the `createNote` handler that the editor registers through `setCreateNote` while a vault is open; the handler saves a new note titled with the query and opens it.
- Choosing a file closes the palette first (after `nextPaint()`), then calls `openFile`; the editor's `LoadingBar` covers the read and re-render. Long-running commands keep the palette open and show a spinner on their row (`aria-busy`).

## Dependencies
- Core: `OverlayPanel`, `Button`, `useFileSystem`, `@codemirror/view` (for heading jumps), `react-icons`.
- Zero-Cloud: No network or telemetry side effects. All search runs in memory.

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
