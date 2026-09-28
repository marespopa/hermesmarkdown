# KeyboardShortcutsOverlay

Description: Overlay listing keyboard shortcuts in General, Formatting and Tables tabs, formatted for the user's platform. Command shortcuts (save, Explorer, AI chat, voice, formatting) are read from the registered commands; editor and table keys are listed statically and must be kept in sync with `editor/codemirror/commands.ts`, `table-display.tsx` and the `/documentation` shortcut reference.

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
