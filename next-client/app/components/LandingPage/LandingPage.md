# LandingPage

Description: Home route hero with a "Start Writing" entry point into the editor and the product video ([LandingVideo](LandingVideo.md), click to load), plus a "welcome back" toast when a local file is already open. The hero is as tall as the visible screen (`min-h-svh`, so a phone browser's bars don't cut it off) with little room above it on small screens (`pt-10`, `sm:pt-14`, `lg:py-20`), so its heading and Start Writing sit in the first screen. Below the full-screen hero, one static scene per idea (Quiet editor, More than notes, Your files, Export and AI), each a two-line heading with the last line in ink blue, a lead sentence and a grid of short points; then a **Pick your paper** section ([LandingThemePicker](LandingThemePicker.md)) lets visitors choose the light/dark mode and palettes; then an FAQ and links to `/markdown-editor`, `/tools` and `/documentation`. Once the hero's buttons scroll away above, a floating **Start Writing** pill ([FloatingStartButton](FloatingStartButton.md)) slides in at the bottom, and leaves when you scroll back up. The copy lives in `landing-content.ts`; `app/page.tsx` turns `LANDING_FAQ` into the home page's FAQPage JSON-LD, so the visible FAQ and the structured data always match.

## Local State & Storage
- State: `atom_hasOpenFileContent`, `atom_userName`, a name draft (useState), ; the welcome-back toast's **Resume** and **Start Writing** both open the editor, on the restored tabs.
- Persistence: `atom_userName` → `localStorage["userName"]`.

## Dependencies
- Core: `TextLink`, `next/navigation` (prefetches `/editor`), `Button`, `Toast`, `LoadingOverlay`, `LandingThemePicker`, `LandingVideo`, `landing-content.ts` (scene and FAQ copy).
- Zero-Cloud: No API or telemetry calls. Only Next.js route prefetching, which is same-origin. The hero video loads from YouTube (youtube-nocookie.com) only after the visitor presses Watch the video.

## Quick Usage
```tsx
import LandingPage from "@/app/components/LandingPage/LandingPage";

<LandingPage />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
