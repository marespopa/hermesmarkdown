# AISelectionToolbar

Description: Floating "Ask AI" button anchored to the current editor selection (desktop). It opens AI Chat with the selection as context — the single place for free-form AI requests.

## Local State & Storage
- State: `atom_activeEditorView`, plus `hasSelection` and position (useState/useRef, updated in requestAnimationFrame).
- Persistence: None - transient UI state.

## Dependencies
- Core: `Portal`, `react-icons`.
- Zero-Cloud: No network itself. `onAsk` opens AI Chat, which goes through `/api/ai`.

## Quick Usage
```tsx
import { AISelectionToolbar } from "./AISelectionToolbar";

<AISelectionToolbar isAiLoading={loading} onAsk={openChat} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| isAiLoading | `boolean` |  | Busy state |
| onAsk | `() => void` |  | Opens AI Chat with the selection |
