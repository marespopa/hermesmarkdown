# Landing page: match the video, show what sets HermesMarkdown apart

## Context

The home page (`next-client/app/components/LandingPage/`) is text only and undersells the product:

- The headline "A place where all you can do is write." doesn't say what the product is, and no longer fits an editor that also has code files, tables, tasks and boards.
- The differentiators are six equal-weight grey paragraphs in a grid; nothing leads, and several features are crammed into one sentence each.
- The product is never shown.
- "Pick your paper" comes second, before the visitor knows what they are theming.
- The video (`ZY_8C1YV5BI`) tells it differently: one idea per scene, a short headline whose last line is ink blue, calm paper background, mono editor mock. It opens on "Markdown notes and code, right in your browser." and closes on "Pick your paper. Four light and four dark themes. Change them any time."

Decisions from the user: use the video's headline; embed the video in the hero; sections below stay static text; lead with **Quiet editor** and **More than notes**; derive the remaining scenes from the product.

## New page structure

1. **Hero** (two columns from `lg`, stacked below)
   - Left: wordmark, `h1` "Markdown notes and code, / right in your browser." (second line `text-[var(--link)]`, the theme's ink blue, so it follows the palette), sub-line "A local-first editor that saves straight to your device. No account, no cloud, nothing to install.", `Start Writing` (hero button) + `Read the docs`, trust line.
   - Right: the video, as a click-to-load facade (see below).
2. **Scene sections**, each in the video's shape: short two-line `h2` with the last line in ink blue, one sentence, then 3–4 short points (title + one line). Order:
   1. *Quiet editor* — "Only your words. / The rest stays out of the way." Points: Markdown marks appear only on the line you're on; command palette (`Ctrl/Cmd+P`) finds files, commands, headings, tasks and text; No Distraction Mode (`Ctrl/Cmd+Alt+Z`); flow mode and Vim keys.
   2. *More than notes* — "Tables, tasks and sketches. / Still plain Markdown." Points: tables you edit like a spreadsheet, with formulas; every task in the vault on one page; drawing boards stored as Markdown; inline calculator; Mermaid and math rendered in place; code files in the same editor (highlighting, outline, Prettier).
   3. *Your files* — "Your files, on your disk. / No account." Points: open a folder and edit in place, offline too; an Obsidian vault opens as-is; keep it in git with your own tools; Safari, Firefox and phones use a browser vault (this absorbs the current "Works in every modern browser" section).
   4. *Optional extras* — "Export and AI, / only if you want them." Points: PDF / HTML / compiled Markdown export; AI with your own key, off until you add one, every change shown as a diff you accept or reject.
3. **Pick your paper.** — moved to the end like the video, with its sub-line "Four light and four dark themes. Change them any time." `LandingThemePicker` unchanged.
4. **Questions** (FAQ, unchanged copy, still feeds the JSON-LD) and the guide links.
5. `FloatingStartButton` unchanged.

All copy is checked against the README feature list; nothing is claimed that the product doesn't do. No mention of other editors beyond the existing Obsidian compatibility note.

## Video embed

New `LandingVideo.tsx` (+ `LandingVideo.md`, `LandingVideo.test.tsx`):

- Renders a 16:9 poster (the video's own thumbnail, saved as `public/assets/hero/video-poster.jpg`, since CSP `img-src` allows only self) with a real `Button` labelled "Watch the video".
- On click it swaps in an `<iframe>` to `https://www.youtube-nocookie.com/embed/ZY_8C1YV5BI?autoplay=1`, with a title and `allow="autoplay; encrypted-media; picture-in-picture; fullscreen"`. No request reaches YouTube before the click.
- `next.config.js`: add `https://www.youtube-nocookie.com` to `frame-src`.
- `app/privacy-policy/page.tsx` (Third-Party Services): one line saying the home page video loads from YouTube only when played.
- `LandingPage.md` "Zero-Cloud" line updated to say the same.

## Files

- `app/components/LandingPage/landing-content.ts` — replace `LANDING_FEATURES` / `LANDING_PLATFORMS` with `LANDING_SCENES` (`{ id, headline, accentLine, lead, points[] }`); `LANDING_FAQ` kept.
- `app/components/LandingPage/LandingPage.tsx` — new hero and scene loop; stays well under 400 lines. Styled links use `TextLink`/`Button` per AGENT_RULES.
- `app/components/LandingPage/LandingVideo.tsx`, `.md`, `.test.tsx` — new.
- `app/components/LandingPage/LandingPage.test.tsx` — new headline, scene headings, video facade (no iframe until clicked), FAQ and links assertions kept.
- `app/components/LandingPage/LandingPage.md`, `app/components/README.md` — docs.
- `next.config.js`, `app/privacy-policy/page.tsx`, `public/assets/hero/video-poster.jpg`.
- A copy of this plan in `next-client/plans/landing-video-match.md` (project rule).

Work happens on the current `release/6.55.0` branch; no second release PR.

## Verification

- Tests are updated with the change but not run locally unless asked; CI runs them on the release PR.
- No headless-browser screenshots. After the edit, please open `/` and check: the hero in a light and a dark theme, the phone layout, that the video plays after one click, and that "Pick your paper" still repaints the page.
- `grep frame-src next.config.js` to confirm the CSP change.
