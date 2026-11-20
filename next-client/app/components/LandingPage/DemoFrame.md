# DemoFrame

Description: The shared box (4:3 on a phone, 16:9 from `sm`) every home page demo ([LandingLoop](LandingLoop.md), [DemoTable](DemoTable.md), [DemoPalette](DemoPalette.md), [DemoRender](DemoRender.md), [DemoFocus](DemoFocus.md), [DemoFiles](DemoFiles.md)) is drawn in. It's an editor sheet framed as a window: rounded corners, a hairline `border-edge-subtle` edge and a soft shadow. The aspect box is reserved before anything draws, so nothing shifts. It is one `role="img"` with an `aria-label`; the children sit in an `aria-hidden` layer. The file also exports `DemoCaret`, the blinking caret in the caret color (still under reduced motion).

## Local State & Storage
- State: none. Persistence: none.

## Dependencies
- Core: none. Zero-Cloud: no network requests.

## Quick Usage
```tsx
const { ref, state } = useScriptLoop(SCRIPT);
<DemoFrame frameRef={ref} label="A note being typed."><DemoCaret /></DemoFrame>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| label | `string` |  | The image's accessible name |
| frameRef | `RefObject<HTMLDivElement \| null>` | none | The hook's `ref`, so the loop can tell when the demo is off screen |
| overlay | `ReactNode` | none | Drawn over the page, outside the text column (the palette, the files view) |
| sidebar | `ReactNode` | none | The editor's sidebar, drawn at the left with the note beside it ([DemoFiles](DemoFiles.md)) |
| children | `ReactNode` |  | The demo's content, hidden from assistive technology |
