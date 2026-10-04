# FilesSettings

Description: The Settings → Files section: Vault (on vault open: home feed or resume last tabs; the new notes folder, normalized on blur; the templates folder, per vault, see [TemplatesFolderSetting](TemplatesFolderSetting.md); show hidden files) and Autosave (mode and delay).

## Local State & Storage
- State: `atom_onVaultOpen`, `atom_newNoteFolder`, `atom_showHiddenFiles`, `atom_autosaveMode`, `atom_autosaveDelay` (the templates folder lives in `TemplatesFolderSetting`).
- Persistence: All via `atomWithStorage` (`localStorage`). Toggling hidden files rescans and re-indexes the open vault straight away.

## Dependencies
- Core: `SettingControls`, `Toggle`, `BareInput`, `TemplatesFolderSetting`, `useFileSystem`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<FilesSettings />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads and writes its settings atoms directly |
