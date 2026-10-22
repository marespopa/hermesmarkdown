# ThemePicker

Description: Picks a color theme (palette) for one mode — the light or the dark one. Each card previews its palette in the palette's own colors, as the editor is laid out: the sidebar (its rows in neutral grey) in the chrome colour beside the page, a line of text and the accent as a single dot, as the caret, so both pickers read correctly whichever mode is showing.

## Local State & Storage
- State: None (controlled).
- Persistence: None here — the caller stores the pick (`atom_lightTheme` / `atom_darkTheme`, localStorage `lightTheme` / `darkTheme`).

## Dependencies
- Core: React, `Button`, `ThemePalette` from `app/theme-palettes.ts`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import ThemePicker from "@/app/editor/settings/components/ThemePicker";
import { LIGHT_THEMES } from "@/app/theme-palettes";

<ThemePicker themes={LIGHT_THEMES} value={lightTheme} onChange={setLightTheme} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| themes | `ThemePalette<T>[]` |  | The palettes to offer, in order |
| value | `T` |  | The selected palette |
| onChange | `(value: T) => void` |  | Called with the clicked palette |

## Logic
- One column per palette (four wrap two by two below `sm`); the selected card gets the sage border and an always-mounted check (opacity toggled, so heights never shift).
- Colors on the preview come from `swatch`; the real palette colors live in `app/theme-palettes.scss`.
