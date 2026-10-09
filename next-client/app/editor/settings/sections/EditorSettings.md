# EditorSettings

Description: The Settings → Editor section: Layout (full width, word wrap, line numbers, invisibles) and Writing (Vim mode, flow mode, hide interface while typing).

## Local State & Storage
- State: `atom_fullWidth` (the editor's text column fills the sheet instead of stopping at `--editor-measure`), `atom_wordWrap`, `atom_lineNumbers`, `atom_showInvisibles`, `atom_vimMode`, `atom_flowMode`, `atom_hideChromeWhileTyping` (on by default).
- Persistence: All via `atomWithStorage` (`localStorage`).

## Dependencies
- Core: `SettingControls`, `Toggle`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<EditorSettings />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads and writes its settings atoms directly |
