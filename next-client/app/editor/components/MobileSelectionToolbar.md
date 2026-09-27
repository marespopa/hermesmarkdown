# MobileSelectionToolbar

Description: Mobile-only floating Bold/Italic/Link toolbar shown below a text selection in the active CodeMirror editor (below, so it doesn't collide with the native selection menu or the Ask AI pill). It dismisses itself when the selection collapses or the editor loses focus.

## Local State & Storage
- State: `atom_activeEditorView`; toolbar position (useState), driven by `selectionchange` and `EditorView.coordsAtPos`.
- Persistence: None - transient UI state.

## Dependencies
- Core: `react-icons`, `codemirror/commands` (`toggleBold`, `toggleItalic`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import MobileSelectionToolbar from "./components/MobileSelectionToolbar";

<MobileSelectionToolbar />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
