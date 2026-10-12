# KeyboardShortcutsOverlay

Description: Overlay listing keyboard shortcuts in General, Formatting and Tables tabs, formatted for the user's platform. Every shortcut is listed statically, since editor commands only register on `/editor` and the overlay also opens from Settings → Guide. Keep it in sync with `editor/hooks/use-editor-shortcuts.ts`, `editor/codemirror/commands.ts`, `editor/codemirror/extensions.ts`, `CommandPaletteContext.tsx`, `HomeFeed.tsx`, and the `/documentation` shortcut reference.

## Local State & Storage
- State: `atom_keyboardShortcutsOpen` and the active category tab (useState).
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
