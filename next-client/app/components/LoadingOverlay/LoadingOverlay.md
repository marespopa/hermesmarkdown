# LoadingOverlay

Description: Full-screen loading veil with optional text, set in the user's rendered font.

## Local State & Storage
- State: `atom_renderedFontFamily`.
- Persistence: None itself; the font comes from `localStorage["renderedFontFamily"]`.

## Dependencies
- Core: `jotai`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import LoadingOverlay from "@/app/components/LoadingOverlay/LoadingOverlay";

<LoadingOverlay isVisible={loading} text="Opening vault…" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isVisible | `boolean` |  | Shows the overlay |
| text? | `string` |  | Caption |
