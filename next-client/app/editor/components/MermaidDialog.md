# MermaidDialog

Description: Full-size viewer for a Mermaid diagram in a note, rendered locally with `mermaid` (`securityLevel: "strict"`). The viewer itself (zoom, fit, drag-to-pan, SVG download) is `MermaidViewer` with `fit="always"`, shared with the Mermaid tool page.

## Local State & Storage
- State: Open state, SVG, loading and error (useState); zoom and drag live in `MermaidViewer`.
- Persistence: None - transient UI state.
- Opened by `CustomEvent("hermes:open-mermaid-dialog", { detail: { source, theme? } })` on `document`. Supports zoom, fit-to-width, drag to pan, and downloading the rendered SVG.

## Dependencies
- Core: `utils/render-mermaid.ts` (lazy-loads `mermaid`), `DialogModal`, `MermaidViewer`.
- Opened from `RenderedBlockSourceDialog`'s **Open viewer** button.
- Zero-Cloud: No network or telemetry side effects. Rendering happens in the browser.

## Quick Usage
```tsx
import MermaidDialog from "./components/MermaidDialog";

<MermaidDialog /> // mount once; open via the custom event
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
