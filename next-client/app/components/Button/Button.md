# Button

Description: Base `<button>` primitive with variant-driven styling, used for every clickable control in the app. iOS-style: filled and borderless, flat. Full-size buttons (`primary`, `secondary`, `warning`, `tertiary`) are 44px with a 12px radius; `hero` is 48px; `outlined` is the gray button with a muted label, the quieter of two actions (Cancel); `small` (32px) and `icon-small` (28px square) are plain, taking the gray fill on hover. `primary` and `hero` are filled with the ink (the accent is kept for the caret, focus and selection), `warning` with each palette's warm red (`--danger`), `secondary` and `outlined` with the gray control fill (`--fill`, a step darker on hover and press). Nothing lifts or scales, and only colour properties transition. A row of `segment`s sits on `SEGMENT_TRACK_CLASS` (exported), the selected one raised on the track. `close` is the round gray × of an iOS sheet. Small controls (`icon`, `icon-small`, `pill-icon`, `close`) get a 44px hit area on touch screens without changing their footprint. All variants share one focus ring, except `menu-row`, which shows keyboard focus as its hover fill. There is no class merging: a `className` that sets the same property as the variant (a height, a text colour) may not win, so a control that needs a different size or colour stays `unstyled`.

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

// A segmented control
import Button, { SEGMENT_TRACK_CLASS } from "@/app/components/Button";

<div role="group" aria-label="View" className={`flex gap-0.5 ${SEGMENT_TRACK_CLASS}`}>
  <Button variant="segment" aria-pressed={view === "list"} onClick={() => setView("list")}>List</Button>
  <Button variant="segment" aria-pressed={view === "grid"} onClick={() => setView("grid")}>Grid</Button>
</div>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| variant | `"primary" \| "secondary" \| "outlined" \| "icon" \| "tertiary" \| "hero" \| "warning" \| "bare" \| "pill-icon" \| "menu-item" \| "menu-row" \| "segment" \| "close" \| "small" \| "icon-small" \| "unstyled"` |  | Visual style. `menu-row`: a compact pop-up menu row. `segment`: one option of a segmented control, selected through `aria-pressed` (or `aria-selected` for a tab), on a `SEGMENT_TRACK_CLASS` track. `close`: the round × of a dialog, menu or toast. `small`: a 32px plain text button. `icon-small`: a 28px square icon button. `unstyled` adds only the focus ring, for controls styled entirely via `className` |
| type? | `"button" \| "submit" \| "reset"` | `"button"` | Button type |
| ref | `Ref<HTMLButtonElement>` |  | Forwarded to `<button>` |
| label? | `string \| ReactNode` |  | Content (alternative to `children`) |
| children? | `ReactNode` |  | Content |
| onClick? | `(e: MouseEvent) => void` |  | Click handler |
| isDisabled? | `boolean` | `false` | Disables the button |
| className? | `string` | `""` | Extra classes |
| ...rest | `any` |  | Forwarded to `<button>` |
