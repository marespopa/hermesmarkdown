# CountBadge

The one look for a count: small (`text-ui-caption`), tabular, faint, with thousands separators (`1,204`). Every count in a listing or bar uses it, so Tasks, the Tags page and the editor's word count read alike.

## Props

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `count` | `number` | — | Formatted with `formatCount` (`en-US` separators). |
| `unit` | `[singular, plural]` | — | Words after the number: `["word", "words"]` → "1 word", "2 words". |
| `variant` | `"inline" \| "floating"` | `"inline"` | `floating`: the same text on a flat raised chip (border, `bg-surface-raised`, no glass), for a count over content such as `WordCountPill`. |
| `className`, other span attributes | | | Passed through (`role`, `aria-hidden`, transitions). |

## Used by

`WordCountPill` (floating), `TasksToolbar` (header total and tab counts), `TaskSection` (group counts), the Tags page's tag list. `formatCount` also builds the Files page summary and the `TokenCostDialog` token count.

`formatCount(count, unit?)` is exported for text that isn't a badge.
