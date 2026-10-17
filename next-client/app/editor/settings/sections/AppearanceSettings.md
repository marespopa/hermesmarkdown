# AppearanceSettings

Description: The Settings → Appearance section: Theme (light, dark, or follow the system, then the palette for that mode — Paper (default)/Solarized/Plain for light, Ink (default)/Nord/Graphite for dark — Paper/Ink warm paper and ink (Ink the dark paper), Plain/Graphite neutral; palettes from earlier versions move to their closest one, see `app/theme-palettes.ts`; Light and Dark show only their own palette as "Colors", System shows both as "Light colors" and "Dark colors") and Typography (editor font, text size, and Full Width, on by default: the text column fills the sheet; off, lines stop at the reading width).

## Local State & Storage
- State: `atom_theme`, `atom_lightTheme`, `atom_darkTheme`, `atom_editorFontFamily`, `atom_renderedFontSize` (text size, from `TEXT_SIZES` in `font-options`; a first visit starts at Medium and Full Width, see `useFirstRun`), `atom_fullWidth`.
- Persistence: All via `atomWithStorage` (`localStorage`).

## Dependencies
- Core: `SettingControls`, `FontPicker`, `ThemePicker`, `Toggle`, `font-options`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<AppearanceSettings />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | Reads and writes its settings atoms directly |
