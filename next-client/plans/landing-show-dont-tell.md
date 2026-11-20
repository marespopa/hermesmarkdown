# Landing page: show the editor working, say less, one name

## Context
Outside feedback on the home page said the product is presented below its quality: the only demo is a plain "Trip notes" list, privacy claims repeat 4–5 times and sound defensive, "When you need more" crams seven features into one paragraph, the brand appears three ways, and the Chrome/Edge folder limit is tucked into a card and the FAQ.

What you decided:
- The name is **HermesMarkdown** everywhere.
- Demos are **scripted live demos** drawn by the page, with no video files.
- **No quotes section** until real quotes exist.

Project rules that apply:
- No competitor names in code, docs or copy.
- Nothing until asked: demos show palette and Markdown power, not chrome.
- Files stay under 400 lines.
- Every component gets a sibling `.md` doc.
- No people names in sample text.

Out of scope:
- **Tabs-bar bug:** there is no tab strip any more (palette-centered, 2026-10-17).
- **Typography polish inside the editor:** a separate task.

## Changes (all under `next-client/app/components/LandingPage/`)

### 1. A shared demo engine
- Pull the typing loop out of `LandingLoop.tsx` (lines 52–71) into a new **`useScriptLoop.ts`** hook.
  - Input: a list of steps (`type` text, `key` such as Tab/Enter/arrows, `pause`). Output: the current step index and typed text.
  - Keeps today's behaviour: a still frame for SSR and for reduced motion, and a wait while the tab is hidden.
  - New: an IntersectionObserver pauses demos that are off screen, so several loops never run at once.
- New **`DemoFrame.tsx`**: the shared bordered `aspect-video` box (`role="img"` plus aria-label; the content is `aria-hidden`), lifted from `LandingLoop.tsx` lines 75–85.

### 2. Demos, one per feature (each a small file using the hook and the frame)
| File | What loops (3–5 s) |
|---|---|
| `LandingLoop.tsx` (hero, rewritten) | A richer note in place of "Trip notes": `# Launch checklist`, a `- [ ]` task becoming checked, **bold**, a link. Marks fade out as the caret leaves each line. |
| `DemoTable.tsx` | Typing into a table with Tab: the cell moves, a new row appears, columns realign. |
| `DemoPalette.tsx` | Ctrl/Cmd+P opens, "exp" filters the list to "Export to PDF", the row highlights. |
| `DemoRender.tsx` | A ```` ```mermaid ```` block (or `$$…$$`) is typed, the caret leaves, and it becomes a drawn diagram (static inline SVG or pre-rendered markup, no runtime mermaid/katex on the landing page). |
| `DemoFocus.tsx` | Focus on: the surrounding paragraphs dim, and the current sentence stays bright as typing moves on. |

All sample text is products, tasks and statuses, never people names. The demos reuse editor tokens (`text-fg-faint`, `--link`, `--caret`, `bg-surface`) so they follow the theme picker.

### 3. One feature per section
- In `landing-content.ts`, replace the `more` scene with a `LANDING_FEATURES` array: `{ id, title, body, demo }`.
  - **Palette:** files, commands, headings, tasks.
  - **Tables:** keyboard table editing.
  - **Diagrams & formulas:** render in place.
  - **Focus**
  - **Export & themes:** PDF/HTML, Vim keys, AI with your own key. No demo: a short line, or the theme picker section absorbs it.
- `LandingPage.tsx` renders each feature as an alternating two-column block: copy on one side, demo on the other, stacked on a phone.
- Keep the "quiet" and "files" scenes, but trim their points to avoid duplicates. The "Marks on your line only" point is what the hero shows; "One palette" and "Focus" move into the feature blocks.
- The section map moves into a new `LandingFeature.tsx`, which keeps `LandingPage.tsx` small.

### 4. Say the privacy claim once, in the hero
- Hero lead (`LandingPage.tsx:75-79`) gets the one strong claim: "No account. Nothing you write leaves your device unless you turn on AI."
- Remove the repeats:
  - Hero footnote (lines 96–99): replaced by the browser line in item 5.
  - "files" scene: accentLine "No account." → "Edited where they are." The point "Nothing is uploaded" goes.
  - `FloatingStartButton.tsx:50`: the sub-line goes, so the button stands alone. Update `FloatingStartButton.md`.
  - `Footer.component.tsx:23` tagline → a neutral line, e.g. "A minimal Markdown editor in your browser."
- Keep the FAQ answers. They answer specific questions and feed the JSON-LD.
- Keep metadata descriptions (`app/layout.tsx:14,79`). They are not shown on the page.

### 5. State the browser limit plainly
- Add one line under the hero CTA (in place of the old footnote): "Edits folders on your disk in Chrome and Edge on a computer. Safari, Firefox and phones keep notes in browser storage."
- Drop the "Folders in Chrome and Edge" point from the files scene. The FAQ entry stays.

### 6. One name
- Hero label `Hermes&middot;Markdown` (`LandingPage.tsx:68`) → `HermesMarkdown`.
- `app/layout.tsx:37` (Apple web-app title) and `app/manifest.json:4` (`short_name`) → `HermesMarkdown`.
  - Note: Android may truncate 14 characters under the home-screen icon. That is acceptable per your choice.
- Leave the internal IndexedDB names (`HermesMDVaultDB` etc.) alone. Renaming them would orphan stored data.

## Tests and docs
- `LandingLoop.test.tsx`: new script text. Use fake timers and assert that marks show only on the caret line.
- New tests for `useScriptLoop`:
  - still frame when reduced motion is set
  - waits while hidden
  - pauses off screen (mock IntersectionObserver)
  - loops
- One light test per demo: its aria-label renders, and its final frame appears.
- `LandingPage.test.tsx`: one heading per feature (read from `LANDING_FEATURES`), the browser line is present, the "No account" phrase appears exactly once on the page, and the hero label is "HermesMarkdown".
- Add `.md` docs for every new component and the hook. Update `LandingLoop.md`, `LandingPage.md`, `FloatingStartButton.md`, the Footer doc, and the folder `README.md`.
- Save a copy of this plan to `next-client/plans/landing-show-dont-tell.md`.

## Verification
- No local build or test unless you ask. When you do: `corepack yarn tsc --noEmit` and `corepack yarn vitest run app/components/LandingPage app/components/Footer` from `next-client`.
- No Playwright. You check the page in a browser: each demo loops, follows theme changes, stops under reduced motion, and the layout holds at phone width.
- Ship by adding to the open `release/6.59.2` PR (one open release PR rule), and let CI run the full suite.
