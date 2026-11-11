# CleanerFixReport

Description: What the Markdown Cleaner did, under its output: "Converted from HTML." / "Converted from CSV/TSV." when the input wasn't Markdown, then the total ("12 fixes") and one chip per rule that fired, in `FIX_IDS` order ("3 list indents", "1 heading"; labels from `fixLabel`). Markdown input with nothing to fix reads "Already clean." Announced politely (`aria-live`).

## Local State & Storage
- State: None.
- Persistence: None.

## Dependencies
- Core: `cleaner-fixes.ts` (`fixLabel`), `convert-input.ts` (`FORMAT_LABELS`).
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
<CleanerFixReport format={result.format} fixes={result.fixes} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| `format` | `"markdown" \| "html" \| "csv"` | — | The format that was converted |
| `fixes` | `{ id: FixId; count: number }[]` | — | Fixes that fired, from `cleanMarkdown` |
