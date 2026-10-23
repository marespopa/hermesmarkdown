# FolderPopover

Description: A folder's contents under the pane title's breadcrumb (`PaneTitle`, opened from `PaneLeaf`), in the way of a code editor's breadcrumbs or a path bar's folder menus. It lists the folder's subfolders, then its notes, by name (`listFolder`, `folder-listing.ts`; empty folders included, from the vault's folder list), with the pane's note marked. A click on a subfolder steps into it and the ← button in its header steps up (to the vault's root, shown by the vault's name); a click on a note opens it in the pane and closes the popover. Focus starts in its filter field: typing filters the list (every word, ignoring case), ↑/↓ move the highlight, Enter opens it, → steps into a highlighted folder, ← or Backspace (with nothing typed) goes up, and Escape or a click outside closes it, focus going back where it was. Its footer's **Show in Files** shows the folder it's on in the sidebar's Files tree (`atom_showFolderInFiles`: the folder and those above it open, the folder selected and scrolled to); it's absent where there's no sidebar. On the vault's root (what the breadcrumb's first crumb opens) the vault switcher follows it (`useVaultMenuItems`, `hooks/use-vault-menu-items.tsx`: recent vaults, then **Open Vault…**, **Create Vault…** and **Browser Vault…** where supported), then **Close Vault** (`onCloseVault`; `PaneLeaf` confirms first, as the palette's Close Vault does). This is where an open vault is switched or closed; the sidebar has no switcher. Each footer row closes the popover before it acts. Kept on screen, and rendered into `document.body` in the shared menu look (`menu-classes.ts`).

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
| onShowInFiles? | `(folder) => void` | — | Shows the folder in the sidebar's Files; absent hides the row |
| onCloseVault? | `() => void` | — | Close Vault, listed on the vault's root |
| onClose | `() => void` | — | Closes it |
