# FolderPopover

Description: A folder's contents under the pane title's breadcrumb (`PaneTitle`, opened from `PaneLeaf`), in the way of a code editor's breadcrumbs or a path bar's folder menus. It lists the folder's subfolders, then its notes, by name (`listFolder`, `folder-listing.ts`; empty folders included, from the vault's folder list), with the pane's note marked. A click on a subfolder steps into it and the ← button in its header steps up (to the vault's root, shown by the vault's name); a click on a note opens it in the pane and closes the popover. Focus starts in its filter field: typing searches everything below the folder it's on, the whole vault from its root (`searchBelow`, `folder-listing.ts`: notes and folders whose name holds every typed word, ignoring case; names starting with the query first, then folders before notes, then by name), each match showing its folder below the searched one, faint, after its name (full path in its tooltip); with no matches and `onNewNote`, a highlighted **Create “…”** row (the folder's name faint after it) creates a note named as typed in the folder it's on, from a click or Enter, then closes the popover and opens it (without `onNewNote` it just says "No matches"); ↑/↓ move the highlight, Enter opens it, → steps into a highlighted folder, ← or Backspace (with nothing typed) goes up, and Escape or a click outside closes it, focus going back where it was. Past `VIRTUALIZE_THRESHOLD` rows (200, shared with the Files tree) the list is virtualized (`@tanstack/react-virtual`; rows measure themselves, and ↑/↓ scroll with `scrollToIndex`), so a vault-wide search or a folder of thousands of notes stays quick. Its header, beside the folder's name, has **New File** and **New Folder** icon buttons (`fileCreateActions`, the Files tree's wording and icons; a hover shows the shared `Tooltip`, portaled, e.g. "New File in Projects"): either turns the filter field into a name field for the folder it's on ("New file name in Projects"); **Enter** creates it there with no picker or prompt (`onNewNote`, after which the popover closes and the note opens; `onNewFolder`, after which the popover steps into the new folder, a taken name getting " 2" as in the Files tree), **Escape** or leaving the field backs out. The footer stays short, one row per group as long menus should be (secondary groups go in a submenu): **Show in Files** shows the folder it's on in the sidebar's Files tree (`atom_showFolderInFiles`: the folder and those above it open, the folder selected and scrolled to); it's absent where there's no sidebar. On the vault's root (what the breadcrumb's first crumb opens) a **Vault ▸** row follows; a click opens a submenu beside it (`TabContextMenu`, "Vault"; a second click closes it, and presses in it don't count as outside the popover) with the vault switcher (`useVaultMenuItems`, `hooks/use-vault-menu-items.tsx`: recent vaults, then **Open Vault…**, **Create Vault…** and **Browser Vault…** where supported), then **Close Vault** (`onCloseVault`; `PaneLeaf` confirms first, as the palette's Close Vault does). Each closes the popover before it acts. This is where an open vault is switched or closed; the sidebar has no switcher. Show in Files closes the popover before it acts. Kept on screen, and rendered into `document.body` in the shared menu look (`menu-classes.ts`).

## Local State & Storage
- State: the folder shown, the filter text and the highlighted row (component state); the vault's notes and folders from `useVaultFileSearch` (Show Hidden Files applies).
- Persistence: None.

## Dependencies
- Core: `Button` (`menu-row` rows), `BareInput`, `useVaultFileSearch`, `listFolder` / `filterListing` (`folder-listing.ts`), `menu-classes.ts`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
{folderMenu && (
  <FolderPopover
    folder={folderMenu.folder}
    anchor={folderMenu.anchor}
    currentPath={leaf.activeFilePath ?? null}
    rootName={vaultName}
    onOpenNote={(handle, path) => void openFile(handle, path)}
    onShowInFiles={(folder) => showFolderInFiles(folder)}
    onClose={() => setFolderMenu(null)}
  />
)}
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| folder | `string` | — | The folder it opens on (`""` = the vault's root) |
| anchor | `DOMRect` | — | The crumb that opened it; it hangs below the crumb's left edge |
| currentPath | `string \| null` | — | The pane's note, marked in its folder |
| rootName | `string` | — | Shown for the vault's root |
| onOpenNote | `(handle, path) => void` | — | Opens a note in the pane |
| onNewNote? | `(folder, name) => void` | — | Creates and opens a note in the folder; absent hides New File |
| onNewFolder? | `(folder, name) => Promise<string \| null>` | — | Creates a folder in the folder, resolving to its path; absent hides New Folder |
| onShowInFiles? | `(folder) => void` | — | Shows the folder in the sidebar's Files; absent hides the row |
| onCloseVault? | `() => void` | — | Close Vault, last in the root's Vault submenu |
| onClose | `() => void` | — | Closes it |
