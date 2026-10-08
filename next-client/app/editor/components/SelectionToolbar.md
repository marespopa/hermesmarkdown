# SelectionToolbar

Description: Floating toolbar shown on a text selection in the active CodeMirror editor, on desktop and mobile alike. It has a **Turn into** menu ([BlockTypeMenu](BlockTypeMenu.md)) naming the current line's type, then Bold, Italic, Link, and **Ask AI** (opens AI Chat with the selection) when AI is configured. On desktop it sits above the selection; on touch screens it docks at the bottom of the screen, above the keyboard, clear of the selection handles and the browser's own Copy/Paste bar. It hides when the selection collapses or the editor loses focus.

## Local State & Storage
- State: `atom_activeEditorView`; toolbar position (useState), recomputed in a `requestAnimationFrame` on `selectionchange`, key/mouse up, resize and scroll, from `EditorView.coordsAtPos` (desktop); `useKeyboardInset` lifts the docked toolbar clear of the keyboard where the browser doesn't resize the page.
- Persistence: None - transient UI state.

## Dependencies
- Core: `Portal`, `Button`, `react-icons`; `toggleBold` / `toggleItalic` (`codemirror/commands`), `wrapAsLink` (`codemirror/format-shortcuts`); `BlockTypeMenu`.
- Zero-Cloud: No network itself. `onAsk` opens AI Chat, which goes through `/api/ai`.

## Quick Usage
```tsx
import SelectionToolbar from "./components/SelectionToolbar";

<SelectionToolbar
  placement={isMobileChrome ? "docked" : "above"}
  onAsk={isAiConfigured ? openChat : undefined}
  isAiLoading={isAiLoading}
/>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| placement | `"above" \| "docked"` |  | Over the selection, or docked at the bottom above the keyboard |
| onAsk | `() => void` | — | Opens AI Chat with the selection; omit to hide Ask AI |
| isAiLoading | `boolean` | `false` | Hides Ask AI while an AI request runs |

## Logic
- Buttons keep the editor focused (pointer/mouse down is prevented), so the selection survives and formats can be stacked.
- A whitespace-only selection shows nothing.
- The pill is clamped to stay on screen; a selection spanning lines centers it horizontally.
