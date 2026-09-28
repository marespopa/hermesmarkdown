# RenderedBlockSourceDialog

Description: Source editor for a Mermaid diagram or display-math block that the editor shows rendered (`codemirror/rendered-block.ts`). It has a monospace textarea and a live preview side by side. **Save** writes the edited body back into the note as one undoable change.

## Local State & Storage
- State: the open request (`{ view, match }`), the draft text, and the latest preview result (useState).
- Persistence: None - transient UI state. The note is only changed on Save.
- Opened by `openRenderedBlockSource(view, match)` from `utils/open-helper-dialogs.ts`, which dispatches `CustomEvent("hermes:open-rendered-block-source")` on `document`. The editor calls it on double-click, from the preview's Edit button, on Ctrl/Cmd+Shift+Enter beside a block, and when the slash menu inserts an empty Mermaid block.

## Logic
- The preview re-renders 250 ms after typing stops, through the shared cache in `utils/rendered-block-cache.ts`, so saved source is already rendered when the editor redraws.
- Save / Ctrl/Cmd+Enter calls `applyRenderedBlockEdit`. It finds the block again by position and original source, then replaces only the body between the fences. Cancel, Escape and the close button discard the draft. Focus returns to the editor either way.
- For Mermaid, **Open viewer** opens `MermaidDialog` with the current draft for zoom, pan and SVG download.

## Dependencies
- Core: `DialogModal`, `Button`, `Textarea`, `codemirror/rendered-block.ts`, `utils/rendered-block-cache.ts`.
- Zero-Cloud: No network or telemetry side effects. Mermaid and KaTeX render in the browser.

## Quick Usage
```tsx
import RenderedBlockSourceDialog from "./components/RenderedBlockSourceDialog";

<RenderedBlockSourceDialog /> // mount once; open via openRenderedBlockSource()
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
