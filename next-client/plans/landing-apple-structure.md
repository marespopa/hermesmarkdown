# Landing page restructure: premium, Apple-like

## Context
The uncommitted "show, don't tell" pass (`plans/landing-show-dont-tell.md`) already built most of the pieces: a shared demo engine (`useScriptLoop.ts`, `DemoFrame.tsx`), four feature demos (`DemoPalette`, `DemoTable`, `DemoRender`, `DemoFocus`), `LandingFeature.tsx`, one brand name ("HermesMarkdown"; only internal IndexedDB names still say HermesMD and those stay), and copy in `landing-content.ts`.

What's still missing is the page *structure* and *tone* from the brief:
- The hero is a two-column layout, not "headline, then a big framed demo".
- There's no Statement, no Specs table and no closing section.
- The FAQ is always open.
- There are no scroll reveals.
- Sections are divided by rules instead of whitespace.

This plan restructures the page around the existing demos. It adds no new dependencies and no video files.

**Your decisions:**
- Headline: "Markdown, without the markup."
- The privacy promise lives in the Statement.
- Chapters: palette, tables, diagrams & formulas, focus.
- Visuals: animated mocks, not recorded clips.
- Voice input is left out because it doesn't exist in the app.

## Sections and copy

**1. Hero** (centred, `min-h-svh`)
- Wordmark: `HermesMarkdown` (small, tracked uppercase, as now)
- H1: **Markdown, without the markup.**
- Subline (13 words): "A minimal Markdown editor in your browser. Marks show only where you type."
- CTA: **Start writing** (Button `hero`). Quiet link: "Read the docs →"
- Below: `LandingLoop`, the hero demo, made wide (`max-w-5xl`) in a window frame with a soft shadow. It is the centrepiece.
- Removed from the hero: the privacy sentence (moves to the Statement) and the browser footnote (moves to Specs).

**2. Statement** (one sentence, `text-4xl md:text-6xl`, centred, generous whitespace)
- "No account. No upload. Your words never leave your device."
- A quiet footnote below keeps this honest about AI: "Unless you turn on AI with your own key. See the specs below." This links to `#specs`.

**3. Chapters** (alternating sides, one viewport tall each, visual first on a phone)

| Eyebrow | Headline | Body | Demo |
|---|---|---|---|
| Command palette | Everything is one keystroke away. | Ctrl/Cmd+P finds files, commands, headings and tasks. | DemoPalette |
| Tables | Tables, by keyboard. | Tab to the next cell. The columns realign as you type. | DemoTable |
| Diagrams & formulas | Write it. See it drawn. | Diagrams and formulas render in place once the caret moves on. | DemoRender |
| Focus | Just the sentence you're writing. | Ctrl/Cmd+Alt+Z hides everything else and can dim all but your sentence. | DemoFocus |

- The "export" feature block is removed. Its facts move to Specs.
- The "quiet" scene is removed because the hero demo now shows it.

**4. Files**
- Eyebrow: Files. Headline: **Plain `.md` files. Yours.**
- Body: "Open a folder or an Obsidian vault and edit it where it is. Commit it with git."
- Visual: a new static `DemoFiles.tsx` showing a folder tree of `.md` files beside the same note as raw text in a plain, unbranded text-editor window. No other product is named or shown. It reuses DemoFrame tokens and needs no loop.

**5. Themes** (full width)
- Headline: **Make it yours.** Body: "Three light and three dark themes."
- `LandingThemePicker` sits above a still frame of the hero note. The demos already use editor tokens, so picking a theme restyles the frame in place.

**6. Specs** (`id="specs"`): a quiet two-column `<dl>` table, like Apple's Tech Specs, with hairline row dividers

| | |
|---|---|
| Files | Plain Markdown (`.md`). Obsidian vaults open as-is, and wikilinks keep working. |
| Storage | Chrome and Edge on a computer: a folder on your disk. Safari, Firefox and phones: browser storage on the device, so export a zip now and then. |
| Account | None. |
| Offline | Works offline once installed as an app from your browser. |
| AI | Off by default. Uses your own key, or a local Ollama model. Requests pass through the HermesMarkdown server, which stores nothing (Ollama calls go straight from your browser). |
| Export | PDF, HTML, or the whole vault as a zip. |
| Keyboard | Optional Vim keys. |

**7. FAQ**: 5 questions in native `<details>`/`<summary>`, collapsed by default. JSON-LD still comes from `LANDING_FAQ`.
1. Where are my files stored? (kept)
2. What if my browser clears its data? (kept)
3. What happens to my text when I use AI? (kept)
4. **Can I open my Obsidian vault?** New: "Yes. A vault is a folder of Markdown files. Open it in Chrome or Edge on a computer and edit it in place. Wikilinks keep working."
5. **How do I get my notes out?** New: "They're already plain `.md` files. From a browser vault, export everything as a zip from the command palette."

"Offline" and "Safari/iPhone" are dropped from the FAQ because Specs now says them once. The "New to Markdown?" links paragraph stays below the FAQ in small type.

**8. Closing**
- **Markdown, without the markup.** with **Start writing**, centred.
- The existing global `Footer` stays as it is. It's shared by every page, so trimming it is out of scope unless you want that. Note: it contains a 🧡 emoji.

## Visual system
- `landing-styles.ts`:
  - `SECTION`: no `border-t`; `py-24 md:py-32`, `min-h-[80svh] flex items-center`.
  - New `DISPLAY` (`text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]`), `EYEBROW` (`text-ui-footnote font-semibold text-fg-muted`), `TEXT_COL` (`max-w-2xl`) and `VISUAL_COL` (`max-w-screen-xl`).
  - `H2` grows to `text-4xl md:text-5xl tracking-tight`. Letter-spacing is tight on headlines only.
- Body copy uses theme tokens (`text-fg-muted`) instead of `neutral-*`, so it stays AA in all 6 themes.
- The accent is used only on the CTA. The `text-[var(--link)]` accent lines are dropped.
- `DemoFrame` gets an optional `window` variant: rounded corners, a hairline border and a soft shadow. Every demo keeps its reserved aspect box, so there's no layout shift.

## Motion
- New `Reveal.tsx` (about 30 lines): an IntersectionObserver that triggers once and adds a fade plus 12px rise (CSS transition). Under `motion-reduce` the content renders static. Content is visible by default before hydration, so there's no SSR flash and nothing hidden from crawlers.
- The demos already pause off screen and show a still frame under reduced motion (`useScriptLoop`). No change there.
- Demos below the fold are loaded with `next/dynamic` (`ssr: true`) so the hero stays light.

## Files
Under `next-client/app/components/LandingPage/`:
- **Edit:**
  - `LandingPage.tsx`: new section order. Split it into `LandingHero.tsx`, `LandingSpecs.tsx` and `LandingFaq.tsx` to stay under 400 lines.
  - `LandingFeature.tsx`: add the eyebrow, and order the visual first on a phone.
  - `landing-content.ts`: `LANDING_FEATURES` gains `eyebrow`; add `LANDING_SPECS`, `LANDING_STATEMENT` and `LANDING_HEADLINE`; remove `LANDING_SCENES`; update the FAQ.
  - `landing-styles.ts`, `DemoFrame.tsx`, `FloatingStartButton.tsx` (label becomes "Start writing").
- **New:** `Reveal.tsx`, `DemoFiles.tsx`, `LandingHero.tsx`, `LandingSpecs.tsx`, `LandingFaq.tsx`, each with a sibling `.md` doc.
- **Docs:** update `LandingPage.md`, `LandingFeature.md`, `DemoFrame.md` and the folder README. Save this plan to `next-client/plans/landing-apple-structure.md`.

## Tests
- `LandingPage.test.tsx`:
  - one H1 with the headline
  - the headline appears twice (hero and closing)
  - "No account" appears exactly once in visible copy (the Specs "Account: None." is worded so it doesn't match)
  - one H2 per chapter
  - a Specs row for each `LANDING_SPECS` entry
  - FAQ `<details>` closed by default, with 5 of them
  - two "Start writing" CTAs plus the floating one
- New light tests for `Reveal` (static under reduced motion, reveals on intersect, mocked IO) and `DemoFiles` (aria-label).
- Existing demo and `useScriptLoop` tests stay.

## Verification
- No local build or test unless you ask. When you do, from `next-client`: `corepack yarn tsc --noEmit && corepack yarn vitest run app/components/LandingPage`.
- No Playwright. You check in a browser:
  - the hero demo types
  - the theme picker restyles the frames
  - reduced motion shows still frames
  - phone width stacks with the visual first
  - Lighthouse mobile scores 95+
- Ship by adding to the open `release/6.59.2` PR and let CI run.
