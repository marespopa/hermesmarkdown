# LandingThemePicker

Description: The home page's theme selector, in its own section below the hero. A Light / Dark / System control, then the palette cards ([ThemePicker](../../editor/settings/components/ThemePicker.md)) for that mode: Paper (default), Solarized, Plain for light; Ink (default), Nord, Graphite for dark. System shows both, headed "Light" and "Dark". The picks are the same ones Settings → Appearance makes, so the page repaints as you choose and the editor opens in them.

## Local State & Storage
- State: `atom_theme`, `atom_lightTheme`, `atom_darkTheme` (shared with Settings → Appearance and the Theme commands).
- Persistence: `localStorage["theme"]`, `["lightTheme"]`, `["darkTheme"]`; `ThemeProvider` applies them to `<html>`.

## Dependencies
- Core: `ThemePicker`, `SegmentedControl` (`app/editor/settings/components`), `app/theme-palettes.ts`.
- Zero-Cloud: No network calls.

## Quick Usage
```tsx
import LandingThemePicker from "@/app/components/LandingPage/LandingThemePicker";

<LandingThemePicker />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
