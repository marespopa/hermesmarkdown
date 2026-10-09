# TokenView

Description: The tokenized text, each token on one of five cycling tints (light and dark variants) with its id in the tooltip, or the comma-separated token IDs. Line breaks show as ↵ so whitespace-only tokens are visible.

## Local State & Storage
- State: none. Persistence: none.

## Quick Usage
```tsx
<TokenView segments={result.segments} showIds={false} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| segments | `TokenSegment[]` | | From `segmentTokens` |
| showIds | `boolean` | | IDs instead of text |
