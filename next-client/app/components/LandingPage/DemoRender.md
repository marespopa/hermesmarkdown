# DemoRender

Description: The Diagrams and formulas demo: a diagram block is typed as code and, once the caret leaves it, becomes a drawn diagram.

## Local State & Storage
- State: from `useScriptLoop` (see [useScriptLoop](useScriptLoop.md)): the loop's position. It starts at the finished demo, so the server render and the first paint are a still.
- Persistence: none.

## Behavior
- Script: a mermaid fence with `Draft --> Review --> Ship` is typed, a pause, then the caret moves below and the block is replaced by a static inline SVG (three boxes and arrows). No mermaid or katex runs on the page.
- To assistive technology the demo is one image with a label; its content is `aria-hidden`.
- Loop control (reduced motion, hidden tab, off screen) is the hook's; the demo follows the theme (`--surface`, `--link`, `--caret`, `--border`).

## Dependencies
- Core: [DemoFrame](DemoFrame.md), `useScriptLoop`.
- Zero-Cloud: No network requests. Drawn by the page; nothing is rendered at runtime by a library.

## Quick Usage
```tsx
<DemoRender />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
