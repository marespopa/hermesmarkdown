# GitChangesToggleButton

Description: Shows or hides the Git Changes diff (`codemirror/git-changes.ts`), the same setting as **Toggle Git Changes** in the palette and Settings → Editor → View. On the editor (`/editor`, desktop) it sits just left of `OutlineToggleButton` in the window's top-right corner (`EditorShell`), in the pill's look (`PILL_BUTTON_CLASS`), with a git-compare icon. While Git Changes is on it's pressed (`aria-pressed`, a stronger fill and ink, no accent color). Its tooltip reads "Show Git Changes" / "Hide Git Changes", or "No .git folder at the vault's root" while it's on in a vault that isn't a repository (`atom_gitAvailable` false).

## Local State & Storage
- State: `atom_showGitChanges`, `atom_gitAvailable` (git-atoms).
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
