# TokenView

Description: The tokenized text, each token on one of five cycling tints (light and dark variants), with every second token also underlined so colour is not the only cue, or the comma-separated token IDs. Click or tap a token, or move through them with the arrow keys (Home, End and Escape work too), to read its position, ID and text in a line below; the `title` stays as a hover hint. Line breaks show as ↵ so whitespace-only tokens are visible, and `showWhitespace` also draws spaces as · and tabs as →.

## Local State & Storage
- State: the selected token index. Persistence: none.

## Quick Usage
```tsx
<TokenView segments={result.segments} showIds={false} showWhitespace />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| segments | `TokenSegment[]` | | From `segmentTokens` |
| showIds | `boolean` | | IDs instead of text |
| showWhitespace? | `boolean` | `false` | Draw spaces and tabs as · and → |
