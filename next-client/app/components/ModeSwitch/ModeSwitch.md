# ModeSwitch

Description: Segmented control with a sliding thumb: a pill track whose highlighted thumb glides under the selected option with an iOS-style ease. It's generic over the option values. The editor uses it for the Edit | Preview switch (`PaneModeSwitch`).

## Local State & Storage
- State: Controlled `value`. Locally it keeps the thumb's measured offset and width (taken from the selected segment, so labels can differ in width, and re-measured when the track resizes) and an `animated` flag, so the thumb appears in place on first paint and only slides afterwards.
- Persistence: None.

## Dependencies
- Core: `Button` (`variant="unstyled"`), `react-icons` types.
- Zero-Cloud: No network or telemetry side effects.

## Accessibility
- `role="radiogroup"` with a `role="radio"` per segment and `aria-checked`. Only the selected segment is in the tab order.
- Arrow keys move the selection and the focus, wrapping around.
- `iconOnly` hides the text, and each segment keeps its label as `aria-label`.
- The slide uses `motion-reduce:transition-none`.

## Quick Usage
```tsx
import ModeSwitch from "@/app/components/ModeSwitch";

<ModeSwitch
  label="Editor mode"
  options={[{ value: "edit", label: "Edit", Icon: HiOutlinePencil }, { value: "preview", label: "Preview", Icon: HiOutlineBookOpen }]}
  value={mode}
  onChange={setMode}
/>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| options | `{ value, label, Icon? }[]` |  | Segments, in order |
| value | `T` |  | Selected value |
| onChange | `(value: T) => void` |  | Called with a newly selected value (never the current one) |
| label | `string` |  | Accessible name of the group |
| size? | `"sm" \| "md"` | `"sm"` | Track height |
| iconOnly? | `boolean` | `false` | Icons only; labels stay as `aria-label` |
| className? | `string` |  | Extra classes on the track |
