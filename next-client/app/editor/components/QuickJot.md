# QuickJot

Description: A one-line input over the current view that appends a line to the end of today's sheet (`<date>.md`) without leaving the note you're in. Opened with **Ctrl+Alt+J** (`⌃⌥J` on Mac), the **Quick jot** palette command (category Document), or the home feed Today row's menu (touch). The active pane, tab, scroll and selection are never touched; focus goes back to what had it when the input closes.

## Behavior
- **Enter** (not while an IME is composing) or **Add** submits. The input closes first, then `useQuickJot().addJot(text)` runs, so the first-time folder prompt and template prompts never fight the overlay for focus.
  - `added`: success toast `Added to <sheet>` with **Open** (`showActionToast`), which calls `onOpenSheet`.
  - `cancelled` (a prompt was cancelled) or `failed` with the sheet not open: the input reopens with the text. `failed` also shows `Couldn't add to today's sheet`.
  - `failed` with `keptInBuffer`: the jot is already in the open tab and goes out with the next autosave, so the text is cleared rather than offered again.
- Empty or whitespace-only text closes without writing.
- **Escape** closes and clears the text. A **click outside** (or the back button) closes but keeps the text for the next open.
- Pasted newlines become single spaces (a single-line input would otherwise glue the lines together).
- The caption shows the date when the input opened: `Enter adds to 2026-10-10 · Esc cancels`.
- The shortcut is ignored while the command palette or a global dialog is open; pressed again while the input is open, it refocuses the input. With `disabledReason` the command is disabled and the shortcut shows the reason as an error toast.

## Local State & Storage
- State: `atom_quickJot` (`{ open, text }`, ephemeral) and the caption date (local). `atom_jotTimePrefix` (Settings → Files → Time on Quick Jots) is read by `useQuickJot`.
- Persistence: none here; the line is written to the vault by `useQuickJot` through `saveFile`.

## Dependencies
- Core: `OverlayPanel` (modal, transparent backdrop, focus trap and focus restore), `BareInput`, `Button`, `showActionToast` / `showErrorToast`.
- Hooks: `useQuickJot` (`editor/hooks/use-quick-jot.ts`: format, ensure today's sheet, reconcile an open tab with disk, append, save, reindex; one jot at a time) and `useQuickJotEntry` (`editor/hooks/use-quick-jot-entry.ts`: the palette command and the window shortcut listener, `isQuickJotShortcut` in `editor/utils/tab-shortcuts.ts`).
- Line format and append: `app/utils/quick-jot.ts` (`formatJotLine`, `appendJotLine`, `jotTime`).
- Zero-Cloud: no network or telemetry side effects.

## Quick Usage
```tsx
// Mounted once in app/editor/page.tsx (so /editor only).
<QuickJot
  disabledReason={isVaultLocked ? "Vault is loading" : !vaultHandle ? "Open a vault first" : undefined}
  onOpenSheet={feedProps.onOpenToday}
/>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| disabledReason | `string` | | Disables the command and the shortcut, with this reason |
| onOpenSheet | `() => void` | | Opens today's sheet (the toast's **Open**) |
