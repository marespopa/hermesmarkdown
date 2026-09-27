# EditorSettings

Description: The Settings → Editor section: Appearance (theme, word wrap, line numbers, Vim mode, collapse frontmatter, command palette button, hidden files), Typography (editor font), and Autosave (mode and delay).

## Local State & Storage
- State: `atom_theme`, `atom_wordWrap`, `atom_lineNumbers`, `atom_vimMode`, `atom_frontmatterCollapsedByDefault`, `atom_showCommandPaletteFab`, `atom_showHiddenFiles`, `atom_editorFontFamily`, `atom_autosaveMode`, `atom_autosaveDelay`.
- Persistence: All via `atomWithStorage` (`localStorage`). Toggling hidden files rescans and re-indexes the open vault straight away.

## Dependencies
- Core: `SettingControls`, `FontPicker`, `Toggle`, `useFileSystem`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<EditorSettings />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads and writes its settings atoms directly |
