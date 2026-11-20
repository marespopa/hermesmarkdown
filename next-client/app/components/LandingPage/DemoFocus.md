# DemoFocus

Description: The Focus demo: with Focus on, everything but the current paragraph, and in it the current sentence, is faded.

## Local State & Storage
- State: from `useScriptLoop` (see [useScriptLoop](useScriptLoop.md)): the loop's position. It starts at the finished demo, so the server render and the first paint are a still.
- Persistence: none.

## Behavior
- Script: two paragraphs; Focus turns on and fades the first paragraph and the earlier sentence; Enter starts a new paragraph and two sentences are typed, the fade following the caret from one sentence to the next.
- To assistive technology the demo is one image with a label; its content is `aria-hidden`.
- Loop control (reduced motion, hidden tab, off screen) is the hook's; the demo follows the theme (`--surface`, `--link`, `--caret`, `--border`).

## Dependencies
- Core: [DemoFrame](DemoFrame.md), `useScriptLoop`.
- Zero-Cloud: No network requests. Drawn by the page; nothing is rendered at runtime by a library.

## Quick Usage
```tsx
<DemoFocus />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
