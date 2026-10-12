# FilesSettings

Description: The Settings → Files section: Vault (the New Notes folder, normalized on blur: where drafts and notes made from a template or a folder-less link go; show hidden files), Autosave (mode: After Delay or Manual Only; the delay shows for After Delay) and, last, Privacy (Privacy Mode, see [PrivacyModeSetting](PrivacyModeSetting.md)).

## Local State & Storage
- State: `atom_newNoteFolder`, `atom_showHiddenFiles`, `atom_autosaveMode`, `atom_autosaveDelay` (Privacy Mode lives in `PrivacyModeSetting`).
- Persistence: All via `atomWithStorage` (`localStorage`). Toggling hidden files rescans and re-indexes the open vault straight away.

## Dependencies
- Core: `SettingControls`, `Toggle`, `BareInput`, `PrivacyModeSetting`, `useFileSystem`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<FilesSettings />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads and writes its settings atoms directly |
