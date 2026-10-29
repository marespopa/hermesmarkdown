# GitChangesToggleButton

Description: The editor's git menu. Clicking the button opens a small menu (`TabContextMenu`, right-aligned under it): a disabled **Branch: name** row when the vault has a named local branch, **Show Changes** (the vault's Changes page, through the registered `show-changes` palette command, with its key `Ctrl/Cmd+Alt+G` from `PAGE_SHORTCUTS`) and, below a hairline, **Git Changes in Note** with a check (the diff in the note, `codemirror/git-changes.ts`, the same setting as **Toggle Git Changes** in the palette). The branch is captured when the menu opens, so an asynchronous branch lookup never shifts its rows. Every row has an icon, so the labels line up after the check column. Shown only when the open vault is a disk vault with a `.git` folder at its root, checked once access to a restored vault is allowed (`atom_isVaultPending`) (`useVaultHasGit`, checked again when the window regains focus); otherwise it renders nothing, and both stay in the palette. On the editor (`/editor`, desktop) it sits just left of `OutlineToggleButton` in the window's top-right corner (`EditorShell`), in the pill's look (`PILL_BUTTON_CLASS`), with a git-compare icon, filled while the diff in the note is on (a stronger fill and ink, no accent color); it's a menu button (`aria-haspopup="menu"`, `aria-expanded`). While HEAD's text is still being read (`atom_gitLoading` above 0, Git Changes on) a ring spins around the icon and the button is `aria-busy`; the ring fades in after 150ms (`.loading-bar-appear`), so a quick read shows nothing. Its tooltip reads "Git", or "No .git folder at the vault's root" while the diff is on in a vault that isn't a repository (`atom_gitAvailable` false).

## Local State & Storage
- State: `atom_showGitChanges`, `atom_gitAvailable`, `atom_gitLoading` (git-atoms); `atom_vaultHandle`, `atom_vaultDescriptor` (vault-atoms).
- Persistence: `localStorage["showGitChanges"]` through the atom.

## Dependencies
- Core: `Button`, `Tooltip`, `TabContextMenu`, `useCommandPalette`, `useVaultGitBranch`, `page-shortcuts`, `pane-header-classes.ts`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import GitChangesToggleButton from "./GitChangesToggleButton";

<GitChangesToggleButton />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| className | `string` | `""` | Extra classes |
