# AppearanceSettings

Description: The Settings → Appearance section: Theme (light, dark, or follow the system), Toolbar (Show Sidebar) and Typography (editor font and text size).

## Local State & Storage
- State: `atom_theme`, `atom_editorFontFamily`, `atom_renderedFontSize` (text size, shared with the welcome tour's text size step via `TEXT_SIZES` in `font-options`), `atom_sidebarOpen`.
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
