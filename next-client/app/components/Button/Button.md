# Button

Description: Base `<button>` primitive with variant-driven styling, used for every clickable control in the app. Flat: hover changes a fill (ink and danger fills lighten toward the page, surface fills deepen toward the ink, quiet controls take a soft tint) and pressing deepens it further; nothing lifts or scales, and only colour properties transition. Ink fills (`primary`, `hero`) keep the accent for the caret, focus and selection; `warning` takes each palette's warm red (`--danger`). Small controls (`icon`, `pill-icon`, `close`) get a 44px hit area on touch screens without changing their footprint. All variants share one focus ring, except `menu-row`, which shows keyboard focus as its hover fill.

## Local State & Storage
- State: None (stateless).
- Persistence: None - transient UI state.

## Dependencies
- Core: React only.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import Button from "@/app/components/Button";

<Button variant="primary" label="Save" onClick={save} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| variant | `"primary" \| "secondary" \| "outlined" \| "icon" \| "tertiary" \| "hero" \| "warning" \| "bare" \| "pill-icon" \| "menu-item" \| "menu-row" \| "segment" \| "close" \| "unstyled"` |  | Visual style. `menu-row`: a compact pop-up menu row. `segment`: one option of a segmented control, selected through `aria-pressed` (or `aria-selected` for a tab). `close`: the round × of a dialog, menu or toast. `unstyled` adds only the focus ring, for controls styled entirely via `className` |
| type? | `"button" \| "submit" \| "reset"` | `"button"` | Button type |
| ref | `Ref<HTMLButtonElement>` |  | Forwarded to `<button>` |
| label? | `string \| ReactNode` |  | Content (alternative to `children`) |
| children? | `ReactNode` |  | Content |
| onClick? | `(e: MouseEvent) => void` |  | Click handler |
| isDisabled? | `boolean` | `false` | Disables the button |
| className? | `string` | `""` | Extra classes |
| ...rest | `any` |  | Forwarded to `<button>` |
