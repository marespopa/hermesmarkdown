# Button inventory

Audit of every button in `app/` (tests excluded), 2026-10-17. Source of truth: `app/components/Button/Button.component.tsx`.

## Raw elements

| Element | Count | Status |
|---|---|---|
| `<button>` | 0 | Fixed: the four left (Input's show/hide and clear, Toggle, Toast dismiss) now use `Button variant="unstyled"`. The clear button also gained `aria-label="Clear"`. |
| `<input type="file">` | 4 | Allowed (hidden pickers, AGENT_RULES). |
| `<a>` | 0 | Fixed: every link uses `TextLink` (`inline` ink and underlined, `quiet`, `unstyled`); site paths go through `next/link`. |
| Clickable `<div>` | 2 | `OverlayBackdrop` (mouse dismiss; Escape covers keyboard) and a `stopPropagation` wrapper in `SectionHeader`. Both acceptable. |

## Variants (as audited, before the clean-up below)

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

Done (follow-up on the same release): one motion style. Hover changes a fill or the text colour; nothing lifts or scales, in the variants or at call sites (toast and dialog close buttons, the empty-note pills, the task status button, the site logo). Variants transition colour properties only, not `transition-all`.

## Applied

1. Lift and scale removed from every variant and call site.
2. `hero` is an ink fill, like `primary`; `pill-icon` hovers to ink. The accent stays for the caret, focus and selection.
3. `warning` and destructive menu rows use `--danger` (each palette's warm red; Tailwind `danger`).
4. `icon`, `pill-icon` and the new `close` take a 44px hit area on touch screens (padding grows, a negative margin keeps the footprint).
5. New variants for the patterns that repeated: `menu-row` (the tab, file tree, sidebar, Tasks and Turn-into menus; replaces `MENU_ITEM_CLASS`), `segment` (Settings' segmented controls, now with `aria-pressed`; the Tasks list tabs; the WikiLink dialog tabs) and `close` (toast, dialog and mobile menu).

Still bespoke: one-off controls such as the pane tabs, tree rows, cards and pickers, which keep `unstyled` with their own classes.
