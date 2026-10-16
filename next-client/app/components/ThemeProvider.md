# ThemeProvider

Description: Applies the resolved light/dark theme class to `<html>` in a layout effect, so the theme switches without a flash, and keeps the chosen palettes on `<html data-light-theme data-dark-theme>` (colors in `app/theme-palettes.scss`; the pre-paint script in `app/layout.tsx` sets the same attributes).

## Local State & Storage
- State: `useResolvedTheme()`, which is `atom_theme` combined with the system preference; `atom_lightTheme`, `atom_darkTheme` (unknown values fall back to Paper / Ink).
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
