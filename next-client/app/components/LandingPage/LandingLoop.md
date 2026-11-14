# LandingLoop

Description: The home page hero's demo: a short, silent, looping animation of a note being typed, in a 16:9 box. The page draws it itself, so there is no video file, no embed and no request. A heading, a list and a link are typed one key at a time; Markdown marks (`# `, `[`, `](…)`) show only on the line with the caret and step aside when the caret moves to the next line (list markers stay, as typed). It follows the picked theme (`--surface`, `--link`, `--caret`).

## Local State & Storage
- State: `typed` (useState), the number of characters of the script typed so far. It starts at the full script, so the server render and the first paint are a still of the finished note.
- Persistence: none.

## Behavior
- After 1.2 s the loop starts from an empty note: a key every 80 ms, 380 ms before each Enter, then 3 s on the finished note before starting again (about 11 s a loop).
- `prefers-reduced-motion: reduce`: no typing and no caret blink, only the still of the finished note.
- A hidden tab pauses the loop where it is.
- To assistive technology the box is one image with a label; its text is `aria-hidden`.

## Dependencies
- Core: none.
- Zero-Cloud: No network requests.

## Quick Usage
```tsx
import LandingLoop from "@/app/components/LandingPage/LandingLoop";

<LandingLoop />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
