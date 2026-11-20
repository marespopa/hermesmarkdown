# LandingLoop

Description: The home page hero's demo: a short, silent, looping animation of a note being typed, in a [DemoFrame](DemoFrame.md). The page draws it itself, so there is no video file, no embed and no request. A launch checklist (heading, three tasks with **bold** and a link) is typed one key at a time; Markdown marks (`# `, `- [ ] `, `**`, `[`, `](...)`) show only on the line with the caret and step aside when the caret moves on (the list `- ` is not shown for tasks, which draw as a box). At the end the first task is ticked. It follows the picked theme (`--surface`, `--link`, `--caret`).

## Local State & Storage
- State: the loop position from [useScriptLoop](useScriptLoop.md). It starts at the finished note, so the server render and the first paint are a still with the first task ticked.
- Persistence: none.

## Behavior
- After 1.2 s the loop starts from an empty note: a key every 70 ms, a longer breath before each Enter, a pause, the tick, then about 2.8 s on the finished note before starting again.
- `prefers-reduced-motion: reduce`: no typing and no caret blink, only the still.
- A hidden tab or a hero scrolled off screen pauses the loop where it is (the hook's job).
- To assistive technology the box is one image with a label; its text is `aria-hidden`.

## Dependencies
- Core: `DemoFrame`, `useScriptLoop`.
- Zero-Cloud: No network requests.

## Quick Usage
```tsx
import LandingLoop from "@/pp/components/LandingPage/LandingLoop";

<LandingLoop />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
