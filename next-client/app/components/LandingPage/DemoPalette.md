# DemoPalette

Description: The Palette demo: Ctrl/Cmd+P opens the command palette over a note and a few letters narrow the list to one command.

## Local State & Storage
- State: from `useScriptLoop` (see [useScriptLoop](useScriptLoop.md)): the loop's position. It starts at the finished demo, so the server render and the first paint are a still.
- Persistence: none.

## Behavior
- Script: the note alone, the palette opens, "exp" is typed and the list narrows to "Export to PDF", whose row is selected. About 7 s a loop.
- To assistive technology the demo is one image with a label; its content is `aria-hidden`.
- Loop control (reduced motion, hidden tab, off screen) is the hook's; the demo follows the theme (`--surface`, `--link`, `--caret`, `--border`).

## Dependencies
- Core: [DemoFrame](DemoFrame.md), `useScriptLoop`.
- Zero-Cloud: No network requests. Drawn by the page; nothing is rendered at runtime by a library.

## Quick Usage
```tsx
<DemoPalette />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
