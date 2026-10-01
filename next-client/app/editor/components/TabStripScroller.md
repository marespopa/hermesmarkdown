# TabStripScroller

Description: Wraps a pane's tab strip in a horizontally scrolling container. When the tabs are wider than the strip, two arrow buttons ("Scroll tabs left" / "Scroll tabs right") appear at the strip's end; each scrolls by about 70% of the visible width and is disabled when that edge is reached. With no overflow the arrows are hidden.

## Local State & Storage
- State: local `{ overflows, canLeft, canRight }`, re-measured on resize (`ResizeObserver`), on scroll, and after every render (tabs opening or closing change the content width without resizing the strip).
- Persistence: none.

## Dependencies
- Core: `Button`, `react-icons`.
- Zero-Cloud: No network or telemetry side effects.

## Quick Usage
```tsx
import TabStripScroller from "./TabStripScroller";

<TabStripScroller className="flex items-center flex-1 overflow-x-auto scrollbar-none" onDrop={handleDrop}>
  {tabs}
</TabStripScroller>
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| className | `string` | `""` | Classes for the scrolling container |
| ...rest | `HTMLAttributes<HTMLDivElement>` |  | Forwarded to the scrolling container (e.g. drag-and-drop handlers) |
| children | `ReactNode` |  | The tabs |
