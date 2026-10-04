# MainPage

Description: Root layout shell. It mounts providers, the command palette, global commands, toasts, `GlobalDialog`, `TemplateDialogHost` (template picker / prompts form), and the header/footer (both hidden on `/editor`).

## Local State & Storage
- State: `usePathname()` for chrome visibility. Children use the Jotai store from `CustomProviders`.
- Persistence: None itself.

## Dependencies
- Core: `CustomProviders`, `CommandPaletteProvider`, `CommandPalette`, `AppCommands`, `SettingsCommands`, `KeyboardShortcutsOverlay`, `react-hot-toast`, `next/script`.
- Network: In production only, loads the `liteanalytics.com/lite.js` page-view analytics script. It sends no document content. No other calls.

## Quick Usage
```tsx
import MainPage from "@/app/components/MainPage";

<MainPage>{children}</MainPage>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| children | `ReactNode` |  | Route content |
