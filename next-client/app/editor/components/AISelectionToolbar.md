# AISelectionToolbar

Description: Floating "Ask AI" button anchored to the current editor selection.

## Local State & Storage
- State: `atom_activeEditorView`, plus `hasSelection` and position (useState/useRef, updated in requestAnimationFrame).
- Persistence: None - transient UI state.

## Dependencies
- Core: `Portal`, `react-icons`.
- Zero-Cloud: No network itself. `onPrompt` opens the AI flow, which goes through `/api/ai`.

## Quick Usage
```tsx
import { AISelectionToolbar } from "./AISelectionToolbar";

<AISelectionToolbar isAiLoading={loading} onPrompt={openChat} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isAiLoading | `boolean` |  | Busy state |
| onPrompt | `() => void` |  | Opens the AI prompt |
