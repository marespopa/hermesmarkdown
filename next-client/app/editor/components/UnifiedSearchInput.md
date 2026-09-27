# UnifiedSearchInput

Description: Search field that turns `#tag` entries into removable tag chips alongside free text, with tag autocomplete.

## Local State & Storage
- State: Input value, tag-input mode, tag query, and suggestion index (useState).
- Persistence: None - transient UI state.

## Dependencies
- Core: `constants` (`TAG_COLORS`, `WORKFLOW_TAGS`), `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import UnifiedSearchInput from "./UnifiedSearchInput";

<UnifiedSearchInput tokens={tags} text={q} allTags={all} onTokenAdd={add} onTokenRemove={remove} onTextChange={setQ} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| tokens | `string[]` |  | Selected tag chips |
| text | `string` |  | Free-text query |
| allTags | `string[]` |  | Autocomplete source |
| onTokenAdd / onTokenRemove | `(tag: string) => void` |  | Chip handlers |
| onTextChange | `(text: string) => void` |  | Text handler |
| autoFocus? | `boolean` | `false` | Focus on mount |
