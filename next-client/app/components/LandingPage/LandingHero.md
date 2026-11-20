# LandingHero

Description: The home page's first screen, centred: the `HermesMarkdown` wordmark, the headline (`LANDING_HEADLINE`, an `h1` in display type), one line (`LANDING_SUBLINE`), **Start writing**, and a quiet "Read the docs →" link. Under them is the editor typing a note ([LandingLoop](LandingLoop.md)) at up to `max-w-5xl`, as the page's centrepiece. It is `min-h-svh` tall, so a phone browser's bars don't cut it off.

## Local State & Storage
- State: none. Persistence: none.

## Dependencies
- Core: `Button`, `TextLink`, [LandingLoop](LandingLoop.md), `landing-content.ts`, `landing-styles.ts`. Zero-Cloud: no network requests.

## Quick Usage
```tsx
<LandingHero ctaRef={heroCtaRef} onStart={handleStart} />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| ctaRef | `RefObject<HTMLDivElement \| null>` |  | Wraps the buttons, so [FloatingStartButton](FloatingStartButton.md) knows when they have scrolled away |
| onStart | `() => void` |  | What Start writing does |
