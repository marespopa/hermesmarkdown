# AppearanceSettings

Description: The Settings → Appearance section: Theme (light, dark, or follow the system), Toolbar (Toolbar Style — Icon Only or Icon and Text, `TOOLBAR_STYLE_OPTIONS` exported for the welcome wizard — and Show Sidebar) and Typography (editor font).

## Local State & Storage
- State: `atom_theme`, `atom_editorFontFamily`, `atom_toolbarDisplayMode`, `atom_sidebarOpen`.
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
