# CommandPalette

Description: Unified quick-open and command surface (`Ctrl/Cmd+K` for files, `Ctrl/Cmd+Shift+P` for commands). `CommandPaletteProvider` owns registration and `AppCommands` registers global commands.

## Local State & Storage
- State: `useCommandPalette()` context (isOpen, commands, register). Atoms: `atom_palettePinnedItems`, `atom_recentFilePaths`, `atom_commandUseCounts`, `atom_recentCommandIds`, `atom_fileMetadata`, `atom_allTasks`, `atom_theme`.
- Persistence: `localStorage` keys `palettePinnedItems` (max 5), `recentFilePaths`, `commandUseCounts`, `recentCommandIds`.
- Query prefixes: none = files, `#` tags, `>` commands, `!` tasks, `@` headings. Ranking happens client-side in `command-search.ts`.

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
