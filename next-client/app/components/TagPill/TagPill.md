# TagPill

The single tag look: rounded, hairline `edge` border, chrome background at 72%, text at 0.9em of its surroundings. Workflow tags (`draft`, `review`, `active`, `archived`) are `sage`; others `fg-muted`. Only CSS-var tokens, so dark mode and palettes follow.

## Props

| Prop | Description |
| --- | --- |
| `tag` | Tag name without `#` |
| `label` | Replaces the default `#tag` text (palette highlights) |
| `trailing` | Node inside the pill after the label (search chip ×) |
| other span props | Passed through (`className`, `role`, `aria-*`) |

## Helpers

- `tagKind(tag)` → `"workflow" | "custom"`
- `tagPillClass(kind)` → class string
- `TAG_PILL_CLASS` → shared base classes

Size is em-relative: callers set the font size on the parent.

## Used by

The editor (`codemirror/tag-pills.ts`, `frontmatter-fold.ts`), `TaskRow`, `UnifiedSearchInput`, `PaletteRow` (`#` scope).
