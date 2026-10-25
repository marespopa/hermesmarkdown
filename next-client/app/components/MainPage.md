# MainPage

Description: Root layout shell. It mounts providers, the command palette, global commands, toasts (react-hot-toast, on the panel material: `.glass-panel` plus its fill and shadow inline, since the library's inline defaults would cover the class), `GlobalDialog`, `TemplateDialogHost` (template picker / prompts form), and the header/footer (both hidden on `/editor`). On `/editor` the shell is pinned to the viewport (`h-full`, no page scroll); everywhere else it grows with the page (`min-h-screen`) so the sticky header stays put while scrolling. It also mounts `useTapRefocus`, so on Android Chrome the first tap on a field that script focused hooks up the on-screen keyboard, and `usePageViews`, the page-view analytics.

The command palette and the keyboard shortcuts overlay are loaded with `next/dynamic` so the marketing pages don't ship their code (CodeMirror, the file system and content search hooks). On `/editor` they mount at once, as before: the palette keeps the content index in sync there. On every other route each one mounts the first time it opens (⌘K, or the shortcuts atom) and stays mounted after, so its closing animation still plays. Both chunks are fetched when the browser goes idle (`requestIdleCallback`, or a 2s timeout), so the first open on a marketing page is still instant.

## Local State & Storage
- State: `usePathname()` for chrome visibility and whether the overlays mount at once; each overlay remembers that it has been opened once. Children use the Jotai store from `CustomProviders`.
- Persistence: None itself.

## Dependencies
- Core: `CustomProviders`, `CommandPaletteProvider`, `CommandPalette`, `AppCommands`, `SettingsCommands`, `KeyboardShortcutsOverlay`, `useTapRefocus`, `usePageViews`, `react-hot-toast`.
- Network: In production only, one LiteAnalytics page-view beacon per path (`usePageViews` → `utils/page-view.ts`), with the path only: no query (so never the editor's `?file=` note path or `?tag=`), no hash, the referrer's origin only. Their `lite.js` isn't loaded: it reported the full URL on every history change. No other calls.

## Quick Usage
```tsx
import MainPage from "@/app/components/MainPage";

<MainPage>{children}</MainPage>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| children | `ReactNode` |  | Route content |
