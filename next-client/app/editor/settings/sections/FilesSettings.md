# FilesSettings

Description: The Settings → Files section: Vault (the New Files folder, normalized on blur: where drafts and notes made from a template or a folder-less link go; show hidden files; Search Markdown Files Only, which optionally limits the palette's `/` text search to Markdown notes), Autosave (mode: After Delay, a fixed `AUTOSAVE_DELAY` of 2s after the last keystroke, or Manual Only) and, last, Privacy (Privacy Mode, see [PrivacyModeSetting](PrivacyModeSetting.md)).

## Local State & Storage
- State: `atom_newNoteFolder`, `atom_showHiddenFiles`, `atom_searchMarkdownOnly`, `atom_autosaveMode` (Privacy Mode lives in `PrivacyModeSetting`).
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
