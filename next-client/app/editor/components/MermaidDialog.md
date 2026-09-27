# MermaidDialog

Description: Full-size viewer for a Mermaid diagram with zoom and drag-to-pan, rendered locally with `mermaid` (`securityLevel: "strict"`).

## Local State & Storage
- State: Open state, SVG, loading, error, scale, diagram size, and drag state (useState/useRef).
- Persistence: None - transient UI state.
- Opened by `CustomEvent("hermes:open-mermaid-dialog", { detail: { source, theme? } })` on `document`. Supports zoom, fit-to-width, drag to pan, and downloading the rendered SVG.

## Dependencies
- Core: `mermaid`, `DialogModal`, `Button`.
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
