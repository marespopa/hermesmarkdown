# UI Components

Shared, app-agnostic UI primitives. Each component has a sibling `<Name>.md` (state, storage, network, usage, props).

- Use these primitives instead of raw HTML controls. Styling uses Tailwind design tokens (`globals.scss` → `tailwind.config.js`), with dark mode via `html.dark`.
- Overlays (dialogs, palette, sheets) build on `OverlayLayer/OverlayPanel` for focus trap, dismissal, and scroll lock.
- Network: only `MainPage` (production page-view analytics script) and the `Footer` badges (third-party images) load external resources.

| Component | Role |
|---|---|
| [Button](Button/Button.md) | Base `<button>` primitive with variant-driven styling, used for every clickable control in the app. |
| [ClientOnly](ClientOnly/ClientOnly.md) | Renders children only after mount, avoiding SSR hydration mismatches for browser-only UI. |
| [CommandPalette](CommandPalette/CommandPalette.md) | Unified quick-open and command surface (`Ctrl/Cmd+K` / `Ctrl/Cmd+P` for files, `Ctrl/Cmd+Shift+K` / `Ctrl/Cmd+Shift+P` for commands). |
| [CustomProviders](CustomProviders.md) | Root provider stack: a Jotai `Provider` bound to the default store, wrapped around `ThemeProvider`. |
| [DialogModal](DialogModal/DialogModal.md) | Modal dialog shell (built on `OverlayPanel`), plus `GlobalDialog`, the app-wide alert/confirm/prompt/select/new-file dialog driven by an atom. |
| [ErrorBoundary](ErrorBoundary.md) | Class error boundary that catches render errors and shows a retry/home fallback instead of a blank page. |
| [Footer](Footer/Footer.md) | Site footer for marketing pages (hidden on `/editor`) with links, app version, and the `ProductHuntBadge`/`ToolsCafeBadge` sub-components. |
| [Header](Header/Header.md) | Marketing-page header with `Navbar`, navigation links, and a theme toggle. |
| [InlineScript](InlineScript.md) | Inline `<script>` that runs once during HTML parsing (theme init) without React's client-side script warning. |
| [Input](Input/Input.md) | Labelled text/number/password/date input with clear button, debounce, and password reveal; also exports `BareInput` (unlabelled) and `Select`. |
| [KeyboardShortcutsOverlay](KeyboardShortcutsOverlay/KeyboardShortcutsOverlay.md) | Overlay listing every registered command that has a shortcut, grouped by category and formatted for the user's platform. |
| [LandingPage](LandingPage/LandingPage.md) | Home route hero with an entry point into the editor, plus a "welcome back" toast when a local file is already open. |
| [LoadingBar](LoadingBar/LoadingBar.md) | Slim top-of-viewport progress bar for short waits (file switching); appears after 150ms. |
| [LoadingOverlay](LoadingOverlay/LoadingOverlay.md) | Full-screen loading veil with optional text, set in the user's rendered font. |
| [MainPage](MainPage.md) | Root layout shell that mounts providers, the palette, toasts, `GlobalDialog`, and the header/footer. |
| [ModeSwitch](ModeSwitch/ModeSwitch.md) | Segmented control with a sliding thumb (radio group), used for the Edit / Preview switch. |
| [OverlayLayer](OverlayLayer/OverlayLayer.md) | `OverlayPanel`/`OverlayBackdrop`: portal, dismissal, focus trap, and scroll lock. |
| [Portal](Portal/Portal.md) | Renders children into `document.body` via `createPortal` once the component has mounted on the client. |
| [SensitiveBadge](SensitiveBadge/SensitiveBadge.md) | Small lock icon (`aria-label="Sensitive note"`) marking sensitive notes and their tasks in listings. |
| [ServiceWorkerRegister](ServiceWorkerRegister.md) | Registers the offline service worker; new versions activate silently. |
| [ThemeProvider](ThemeProvider.md) | Applies the resolved light/dark theme class to `<html>` in a layout effect, so the theme switches without a flash. |
| [Toast](Toast/Toast.md) | Persistent call-to-action card with icon, title, action button, and an optional inline name field. |
| [Toastr](Toastr/Toastr.md) | Styled `react-hot-toast` helpers for transient success, error, copy, and save-state notifications. |
| [Toggle](Toggle/Toggle.md) | Accessible on/off switch for boolean settings. |
| [Tooltip](Tooltip.md) | CSS-only delayed hover tooltip for icon-only controls, with an optional shortcut hint. |
| [Typeahead](Typeahead/Typeahead.md) | Input with a portaled suggestion list filtered from local options, supporting comma-separated multi-values (for example tags). |
