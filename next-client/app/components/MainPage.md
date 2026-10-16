# MainPage

Description: Root layout shell. It mounts providers, the command palette, global commands, toasts (react-hot-toast, on the panel material: `.glass-panel` plus its fill and shadow inline, since the library's inline defaults would cover the class), `GlobalDialog`, `TemplateDialogHost` (template picker / prompts form), and the header/footer (both hidden on `/editor`). On `/editor` the shell is pinned to the viewport (`h-full`, no page scroll); everywhere else it grows with the page (`min-h-screen`) so the sticky header stays put while scrolling. It also mounts `useTapRefocus`, so on Android Chrome the first tap on a field that script focused hooks up the on-screen keyboard.

## Local State & Storage
- State: `usePathname()` for chrome visibility. Children use the Jotai store from `CustomProviders`.
- Persistence: None itself.

## Dependencies
- Core: `CustomProviders`, `CommandPaletteProvider`, `CommandPalette`, `AppCommands`, `SettingsCommands`, `KeyboardShortcutsOverlay`, `useTapRefocus`, `react-hot-toast`, `next/script`.
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
