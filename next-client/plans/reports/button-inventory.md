# Button inventory

Audit of every button in `app/` (tests excluded), 2026-10-17. Source of truth: `app/components/Button/Button.component.tsx`.

## Raw elements

| Element | Count | Status |
|---|---|---|
| `<button>` | 0 | Fixed: the four left (Input's show/hide and clear, Toggle, Toast dismiss) now use `Button variant="unstyled"`. The clear button also gained `aria-label="Clear"`. |
| `<input type="file">` | 4 | Allowed (hidden pickers, AGENT_RULES). |
| `<a>` | 0 | Fixed: every link uses `TextLink` (`inline` ink and underlined, `quiet`, `unstyled`); site paths go through `next/link`. |
| Clickable `<div>` | 2 | `OverlayBackdrop` (mouse dismiss; Escape covers keyboard) and a `stopPropagation` wrapper in `SectionHeader`. Both acceptable. |

## Variants

`icon-bg`, `fab-action` and `fab-toggle` were never used and have been removed.

| Variant | Uses | Size | Hover | Focus | Notes |
|---|---|---|---|---|---|
| `unstyled` | 85 | caller | caller | ring-2 sage, offset 2 | Over half of all buttons: every bespoke control (tabs, rows, pickers, menus) styles itself. The main source of inconsistency. |
| `primary` | 26 | h-11 | opacity 90 + lift (−0.5 translate, shadow, brightness) | ring-2 sage | Ink fill, page-colour label. |
| `secondary` | 24 | h-11 | fill darkens + lift | ring-2 sage | |
| `tertiary` | 18 | h-11 | text darkens | ring-2 sage | |
| `outlined` | 18 | h-11 | fill + border darken | ring-2 sage | |
| `icon` | 17 | 40×40 | fill + scale 105 | ring-2 sage | Under the 44px touch target. |
| `bare` | 9 | text | underline | ring-2 sage, and `focus:underline` | Underlines on mouse focus too. |
| `pill-icon` | 8 | ~24px (p-1) | text turns accent + scale 110 | ring-2 sage | Accent on hover breaks the accent rule; tiny target. |
| `menu-item` | 6 | full width | fill | ring-2 sage | |
| `hero` | 4 | h-12 | lift | ring-2 sage | Accent fill (`bg-accent`) breaks the accent rule. |
| `warning` | 2 | h-11 | darker amber + lift | ring-2 sage | Hard-coded Tailwind amber, not a theme token. |

Other shared buttons: `PaneToolbarButton` / `PANE_ACTION_BUTTON_CLASS` (pane header, 28×28, raised pill on hover, hairline sage ring with no offset), `Toggle` (switch role, `aria-checked`, now the shared ring), `SegmentedControl` options (fill swap).

## Accessibility

- Accessible names: a static scan of every `<Button>` found no icon-only button without `aria-label`, `title` or text. That's a heuristic, so spot-check icon buttons when touched.
- Focus: one ring everywhere (`focus-visible:ring-2 ring-sage ring-offset-2`), except the pane toolbar's deliberate hairline ring.
- Keyboard: Input's show/hide and clear buttons are `tabIndex={-1}`, so they can't be reached by keyboard.
- Touch targets under 44px: `icon` (40), `pill-icon` (~24), pane toolbar buttons (28).

## Hover and motion

There are four motion styles across the variants: lift (translate + shadow), scale (105 / 110), underline, and fill. The flat, minimal look suggests one: fill or text-colour change only, with no lift or scale. Every variant uses `transition-all`; naming the properties (colour, background, box-shadow) would be cheaper and avoids animating layout.

## Suggested next steps

1. Remove lift and scale from all variants; hover = fill or text darkening only.
2. Make `hero` an ink fill (as `primary`) and `pill-icon` hover ink, keeping the accent for the caret, focus and selection.
3. Move `warning` to a theme token (a destructive colour per palette).
4. Raise `icon` and `pill-icon` to a 44px hit area on touch.
5. Turn the most repeated `unstyled` patterns (list rows, chips, menu rows) into variants.
