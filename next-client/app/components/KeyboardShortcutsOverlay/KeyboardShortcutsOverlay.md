# KeyboardShortcutsOverlay

Description: Overlay listing every registered command that has a shortcut, grouped by category and formatted for the user's platform.

## Local State & Storage
- State: `atom_keyboardShortcutsOpen`, `useCommandPalette().commands`, and the active category tab (useState).
- Persistence: None - transient UI state.

## Dependencies
- Core: `OverlayPanel`, `app/utils/platform` (`formatShortcut`), `useIsMobileChrome`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import KeyboardShortcutsOverlay from "@/app/components/KeyboardShortcutsOverlay/KeyboardShortcutsOverlay";

<KeyboardShortcutsOverlay /> // open via atom_keyboardShortcutsOpen
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
