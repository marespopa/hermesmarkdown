# GitChangesToggleButton

Description: Shows or hides the Git Changes diff (`codemirror/git-changes.ts`), the same setting as **Toggle Git Changes** in the palette and Settings → Editor → View. Shown only when the open vault is a disk vault with a `.git` folder at its root (`useVaultHasGit`, checked again when the window regains focus); otherwise it renders nothing, and Git Changes stays in the palette and Settings. On the editor (`/editor`, desktop) it sits just left of `OutlineToggleButton` in the window's top-right corner (`EditorShell`), in the pill's look (`PILL_BUTTON_CLASS`), with a git-compare icon. While Git Changes is on it's pressed (`aria-pressed`, a stronger fill and ink, no accent color). While HEAD's text is still being read (`atom_gitLoading` above 0, Git Changes on) a ring spins around the icon and the button is `aria-busy`; the ring fades in after 150ms (`.loading-bar-appear`), so a quick read shows nothing. Its tooltip reads "Show Git Changes" / "Hide Git Changes", or "No .git folder at the vault's root" while it's on in a vault that isn't a repository (`atom_gitAvailable` false).

## Local State & Storage
- State: `atom_showGitChanges`, `atom_gitAvailable`, `atom_gitLoading` (git-atoms); `atom_vaultHandle`, `atom_vaultDescriptor` (vault-atoms).
- Persistence: `localStorage["showGitChanges"]` through the atom.

## Dependencies
- Core: `Button`, `Tooltip`, `pane-header-classes.ts`.
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
