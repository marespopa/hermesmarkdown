# DemoTable

Description: The Tables demo: a two-column table edited with the keyboard.

## Local State & Storage
- State: from `useScriptLoop` (see [useScriptLoop](useScriptLoop.md)): the loop's position. It starts at the finished demo, so the server render and the first paint are a still.
- Persistence: none.

## Behavior
- Script: the caret sits in the last cell; Tab adds a row, then "Dark theme", Tab, "In progress", Tab, "Release notes", Tab, "Todo". Columns widen to fit what is typed. About 10 s a loop.
- To assistive technology the demo is one image with a label; its content is `aria-hidden`.
- Loop control (reduced motion, hidden tab, off screen) is the hook's; the demo follows the theme (`--surface`, `--link`, `--caret`, `--border`).

## Dependencies
- Core: [DemoFrame](DemoFrame.md), `useScriptLoop`.
- Zero-Cloud: No network requests. Drawn by the page; nothing is rendered at runtime by a library.

## Quick Usage
```tsx
<DemoTable />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
