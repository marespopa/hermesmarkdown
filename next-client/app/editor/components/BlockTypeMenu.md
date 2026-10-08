# BlockTypeMenu

Description: The selection toolbar's **Turn into** dropdown. Its trigger names the current line's block type (Text, H1–H6, List, Numbered, To-do, Quote); its menu turns every selected line into Text, Heading 1–3, a bulleted, numbered or to-do list, or a quote, with the current type checked.

## Local State & Storage
- State: `open` (useState). The current type is read from the editor state on each render (`blockTypeAt`).
- Persistence: None - transient UI state.

## Dependencies
- Core: `Button`, `react-icons`; `blockTypeAt` / `setBlockType` (`codemirror/block-type`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import BlockTypeMenu from "./BlockTypeMenu";

<BlockTypeMenu view={view} keepFocus={(e) => e.preventDefault()} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| view | `EditorView` |  | The editor whose selected lines it converts |
| keepFocus | `(e) => void` |  | Pointer/mouse-down handler that keeps the editor focused |
| opensUp | `boolean` | `false` | Opens the menu above the trigger (docked toolbar) |

## Logic
- Converting replaces each line's marker (`#`, `>`, `- `, `- [ ] `, `1. `) and keeps its text; lists keep their indentation, other types start at the margin. Numbered lines count up from 1. Lines already of the chosen type are left alone.
- Escape or a press outside the menu closes it without changing anything.
