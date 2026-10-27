# ThemeProvider

Description: Applies the resolved light/dark theme class to `<html>` in a layout effect, so the theme switches without a flash, and keeps the chosen palettes on `<html data-light-theme data-dark-theme>` (colors in `app/theme-palettes.scss`; the pre-paint script in `app/layout.tsx` sets the same attributes). The pre-paint script paints the stored picks before React loads, so each effect writes only once its atoms agree with `localStorage` (`atomWithStorage` reads it after mount): writing the atoms' defaults on the first render flashed the default theme for a frame on every load. After every mode or palette change it also copies the painted `--surface` into `<meta name="theme-color">` (`syncThemeColor`, mirrored in the pre-paint script), so the browser's and the installed app's status and navigation bars match the page rather than the OS light/dark scheme.

## Local State & Storage
- State: `useResolvedTheme()`, which is `atom_theme` combined with the system preference; `atom_lightTheme`, `atom_darkTheme` (palettes from earlier versions move to their closest current one, anything else unknown falls back to Paper / Ink).
- Persistence: `atom_theme` → `localStorage["theme"]` (default `"system"`), `atom_lightTheme` → `localStorage["lightTheme"]`, `atom_darkTheme` → `localStorage["darkTheme"]`.

## Dependencies
- Core: React only.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import ThemeProvider from "./ThemeProvider";

<ThemeProvider>{children}</ThemeProvider>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| children | `ReactNode` |  | App tree |
