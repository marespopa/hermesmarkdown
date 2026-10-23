# AIReviewDialog

Description: Word-level diff review of an AI suggestion against the original text, with an editable suggestion and replace or insert-below actions. A review with `applyLabel` (Suggest properties) offers only Cancel and that button, which replaces the reviewed range.

## Local State & Storage
- State: Editable suggestion draft (useState).
- Persistence: None - transient UI state.

## Dependencies
- Core: `DialogModal`, `Button`, `app/utils/text-diff` (`diffWords`).
- Zero-Cloud: No network or telemetry side effects. It shows output that was already fetched.

## Quick Usage
```tsx
import { AIReviewDialog } from "./AIReviewDialog";

<AIReviewDialog review={aiReview} onClose={close} onReplace={replace} onInsertBelow={insertBelow} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| review | `AIReviewState \| null` |  | `{ label, original, suggestion, start, end, applyLabel? }`. Open when non-null |
| onClose | `() => void` |  | Dismiss handler |
| onReplace / onInsertBelow | `(customSuggestion?: string) => void` |  | Apply actions |
