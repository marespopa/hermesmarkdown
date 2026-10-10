# MermaidViewer

Description: A rendered Mermaid diagram in a scrollable, drag-to-pan frame with a floating toolbar: zoom out, zoom level, zoom in, fit, and download SVG. `fit="always"` fits each new diagram to the frame (`MermaidDialog`); `fit="first"` fits the first one and again whenever `fitRequest` changes, so live re-renders keep the reader's zoom (the Mermaid tool). With an `error`, the error text shows under the frame and a diagram still showing is dimmed (the last good render). Shows "Rendering…" while loading with nothing yet, and `emptyText` when there's nothing to draw. Exports `getDiagramSize(svg)` (from the viewBox).

## Local State & Storage
- State: scale, drag state, last fit request (useState/useRef). Persistence: none.

## Dependencies
- Core: `Button`, `react-icons`. No `mermaid` import: callers render the SVG (`utils/render-mermaid.ts`).

## Quick Usage
```tsx
<MermaidViewer svg={svg} loading={loading} error={error} fit="first" fitRequest={n} className="h-[420px]" />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| svg | `string \| null` | | Rendered diagram |
| loading | `boolean` | `false` | |
| error | `string \| null` | `null` | Shown under the frame; dims the diagram |
| fit | `"always" \| "first"` | `"always"` | When to fit to the frame |
| fitRequest | `number` | `0` | With `"first"`, a new value fits again |
| className | `string` | `"h-[60vh]"` | Frame classes (height) |
| downloadName | `string` | `"diagram.svg"` | |
| emptyText | `string` | | Shown with no diagram, error or loading |
