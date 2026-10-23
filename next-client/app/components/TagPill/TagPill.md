# TagPill

The single tag look, an iOS capsule: a tinted fill and no border, medium weight, text at 0.9em of its surroundings. Workflow tags (`draft`, `review`, `active`, `archived`) are `sage` on a 13% tint of it; others `fg-muted` on the gray control fill (`--fill`). Only CSS-var tokens, so dark mode and palettes follow.

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
