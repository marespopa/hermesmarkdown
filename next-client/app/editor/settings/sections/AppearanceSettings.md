# AppearanceSettings

Description: The Settings → Appearance section: Theme (light, dark, or follow the system) and Typography (editor font, text size, and Full Width, on by default: the text column fills the sheet; off, lines stop at the reading width). Show Sidebar lives in Settings → Editor → Layout.

## Local State & Storage
- State: `atom_theme`, `atom_editorFontFamily`, `atom_renderedFontSize` (text size, shared with the welcome tour's text size step via `TEXT_SIZES` in `font-options`), `atom_fullWidth`.
- Persistence: All via `atomWithStorage` (`localStorage`).

## Dependencies
- Core: `SettingControls`, `FontPicker`, `Toggle`, `font-options`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<AppearanceSettings />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads and writes its settings atoms directly |
