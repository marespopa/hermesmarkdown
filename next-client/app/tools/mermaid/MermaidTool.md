# MermaidTool

Description: Mermaid in Markdown, at `/tools/mermaid-in-markdown`. Source on the left (an examples `Select` and a monospace `Textarea`), the live preview on the right (`MermaidViewer`, `fit="first"`), stacked below 768px. `useLiveMermaid` re-renders 400 ms after typing stops and when the site theme changes; an error shows Mermaid's message under the dimmed last good diagram; an empty source shows "Type a diagram to see it here." Choosing an example replaces the source straight away when it's empty or an untouched example, and otherwise asks first (`useDialog().confirm`); loading one fits the preview again. **Copy Markdown** copies the fenced ```` ```mermaid ```` block (`mermaidFence`); `MermaidOpenButton` hands it to the editor. Both are disabled for an empty source.

## Local State & Storage
- State: `atom_mermaidToolSource` (`null` until edited, which shows the flowchart example), local `fitRequest`.
- Persistence: this tab's sessionStorage (`hermes_tool_mermaid`).

## Dependencies
- Core: `useLiveMermaid` (`render-mermaid.ts`, which lazy-loads `mermaid`), `MermaidViewer`, `MermaidOpenButton`, `Select`, `Textarea`, `Button`, `useDialog`, `showCopyToast` / `showErrorToast`.
- Zero-Cloud: rendering runs in the browser; nothing is uploaded.

## Quick Usage
```tsx
<MermaidToolLoader /> // loads this client-only, with a skeleton
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) | | | |
