# LandingPage

Description: The home route, laid out like a product page: one idea per screen, whitespace instead of rules between sections, and the editor shown working rather than described. In order:

1. **Hero** ([LandingHero](LandingHero.md)): the `HermesMarkdown` wordmark, the headline "Markdown, without the markup.", one line, **Start writing**, a quiet "Read the docs" link, and under them the editor typing a note ([LandingLoop](LandingLoop.md)), wide, as the centrepiece. It is `min-h-svh` tall, so a phone browser's bars don't cut it off.
2. **Statement**: the page's one privacy promise in display type ("No account. No upload. Your words never leave your device."), with its one limit right under it ("Unless you turn on AI with your own key.") and a link to the specs.
3. **Chapters** ([LandingFeature](LandingFeature.md)): the command palette, keyboard tables, diagrams and formulas, and Focus. Each has an eyebrow, a headline, one sentence and a live demo, with sides alternating; on a phone, stacked with the demo first.
4. **Files**: the same chapter layout, with a still picture of a folder of `.md` files and one open as plain text ([DemoFiles](DemoFiles.md)).
5. **Themes**: "Make it yours." with [LandingThemePicker](LandingThemePicker.md). The whole page, its demos included, repaints as you pick.
6. **Specs** ([LandingSpecs](LandingSpecs.md), `#specs`): files, storage and the Chrome/Edge folder limit, account, offline, AI, export, themes and keyboard, each said once.
7. **FAQ** ([LandingFaq](LandingFaq.md)): five questions, folded, plus links to `/markdown-editor`, `/tools` and `/documentation`.
8. **Closing**: the headline again, with no button of its own. The floating **Start writing** is already on screen there, and the room left below the line lets it sit right under the headline as the page's last word.

Every section below the hero enters once with a fade and a small rise ([Reveal](Reveal.md)), and stays still under reduced motion. Once the hero's buttons scroll away above, a floating **Start writing** pill ([FloatingStartButton](FloatingStartButton.md)) slides in at the bottom. A "welcome back" toast offers **Resume** when a local file is already open. The copy lives in `landing-content.ts`; `app/page.tsx` turns `LANDING_FAQ` into the home page's FAQPage JSON-LD, so the visible FAQ and the structured data always match.

## Local State & Storage
- State: `atom_hasOpenFileContent`, `atom_userName`, and a name draft (useState). The toast's **Resume**, the hero's **Start writing** and the floating one all open the editor.
- Persistence: `atom_userName` → `localStorage["userName"]`.

## Dependencies
- Core: `next/navigation` (prefetches `/editor`), `TextLink`, `Toast`, `LoadingOverlay`, `LandingHero`, `LandingFeature`, `LandingThemePicker`, `LandingSpecs`, `LandingFaq`, `Reveal`, `landing-content.ts`, `landing-styles.ts`.
- Zero-Cloud: No API or telemetry calls. Only Next.js route prefetching, which is same-origin. Every demo is drawn by the page, with no video file or embed.

## Quick Usage
```tsx
import LandingPage from "@/app/components/LandingPage/LandingPage";

<LandingPage />
```

## Props Overview
| Prop | Type | Default | Description |
|---|---|---|---|
| (none) |  |  | Takes no props |
