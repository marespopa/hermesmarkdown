# AppearanceSettings

Description: The Settings → Appearance section: Theme (light, dark, or follow the system) and Typography (editor font).

## Local State & Storage
- State: `atom_theme`, `atom_editorFontFamily`.
- Persistence: All via `atomWithStorage` (`localStorage`).

## Dependencies
- Core: `SettingControls`, `FontPicker`, `font-options`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<AppearanceSettings />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads and writes its settings atoms directly |
