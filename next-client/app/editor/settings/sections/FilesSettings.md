# FilesSettings

Description: The Settings → Files section: Vault (the new notes folder, normalized on blur; the daily sheets folder, where the home feed's Today row and Quick jot create `<date>.md`, `{{year}}` / `{{month}}` allowed, normalized on blur, empty = vault root, unset until the first sheet asks; Time on Quick Jots, `atom_jotTimePrefix`, off by default, which starts each quick jot with `HH:MM`; the templates folder, per vault, see [TemplatesFolderSetting](TemplatesFolderSetting.md); show hidden files) and Autosave (mode and delay).

## Local State & Storage
- State: `atom_newNoteFolder`, `atom_todayFolder`, `atom_showHiddenFiles`, `atom_autosaveMode`, `atom_autosaveDelay` (the templates folder lives in `TemplatesFolderSetting`).
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
