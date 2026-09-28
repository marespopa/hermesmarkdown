# ThemeProvider

Description: Applies the resolved light/dark theme class to `<html>` in a layout effect, so the theme switches without a flash.

## Local State & Storage
- State: `useResolvedTheme()`, which is `atom_theme` combined with the system preference.
- Persistence: `atom_theme` → `localStorage["theme"]` (default `"system"`).

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
