# ProfileSettings

Description: The first groups of the Settings → General section (rendered above `GuideSettings`). **Profile** sets the name the home feed greets you with; it's trimmed on blur. **Your Data** notes, as static text (`SettingNote`), that everything is stored in this browser (there's no account), and **Command History** clears the command palette's recent commands, recent files, usage counts, and pins after a confirm dialog.

## Local State & Storage
- State: `atom_userName`, `atom_recentCommandIds`, `atom_recentFilePaths`, `atom_commandUseCounts`, `atom_palettePinnedItems`.
- Persistence: `atomWithStorage` (`localStorage`).

## Dependencies
- Core: `SettingControls`, `BareInput`, `Button`, `useDialog`, `Toastr`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<ProfileSettings />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads and writes its atoms directly |
