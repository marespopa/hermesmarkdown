# FilesSettings

Description: The Settings → Files section: Vault (the New Notes folder, normalized on blur: where drafts and notes made from a template or a folder-less link go; show hidden files) and Autosave (mode and delay).

## Local State & Storage
- State: `atom_newNoteFolder`, `atom_showHiddenFiles`, `atom_autosaveMode`, `atom_autosaveDelay`.
- Persistence: All via `atomWithStorage` (`localStorage`). Toggling hidden files rescans and re-indexes the open vault straight away.

## Dependencies
- Core: `SettingControls`, `Toggle`, `BareInput`, `useFileSystem`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<FilesSettings />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads and writes its settings atoms directly |
