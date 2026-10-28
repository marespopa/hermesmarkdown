---
title: Image rendering plan
tags: [rendering, svg, raster]
status: new
---
# Image rendering plan

## Goal

Make every image Hermes renders from the local vault display safely: raster formats keep their current passive path, and SVG is never given a chance to run script, fetch remote resources or reach the app's DOM, storage or origin.

## Assumptions

- The embed pipeline already builds `<img>` elements with `blob:` object URLs from vault files: `imageUrlFor` in `editor/utils/embed-files.ts`, rendered by `NoteEmbedWidget` in `editor/codemirror/note-embeds.ts` (the `{ kind: "image" }` branch).
- SVG currently takes that same path, unsanitised, so the object URL is an asset in the app's origin whenever the browser decides to treat it as a document rather than an image.
- Exports (`renderNote` → `noteToHtml`) reference vault images through a caller-supplied `imageUrl` (`blob:` for PDF, data URL for HTML), and `noteToHtml` drops raw HTML, so exported files stay passive.
- Strategy A (`<img>`) is the default; Strategy B (sanitise with DOMPurify) is added as defence in depth; Strategy C (CSP) is a third layer.

## Deliverables

1. `isSvgPath` helper in `next-client/app/utils/file-kinds.ts`.
2. New `next-client/app/utils/sanitize-svg.ts`: read an SVG file, sanitise it, return a safe `blob:` URL.
3. `dompurify` added as a direct dependency (it is only a transitive `resolutions` entry today) with its types.
4. `embed-files.ts` re-exports the sanitiser alongside `imageUrlFor`.
5. SVG branch in the embed loader (`hooks/use-note-embeds.ts`).
6. Optional `imageUrl` parity in `editor/utils/render-note.ts` so exports sanitise SVGs too.
7. CSP header in `next-client/next.config.js`.
8. Vitest coverage for the sanitiser, the SVG embed branch and the raster path.
9. `SECURITY.md` section on image and SVG handling.

## Step-by-step tasks

| Step | Action                   | File / location                                                                                                       | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| :--- | :----------------------- | :-------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Add SVG detection helper | `next-client/app/utils/file-kinds.ts`                                                                                 | `export const isSvgPath = (path: string) => extensionOf(path) === "svg";` next to `isMarkdownPath`, reusing the existing private `extensionOf`. ✅ Done                                                                                                                                                                                                                                                                                                                                                 |
| 2    | Add DOMPurify            | `next-client/package.json`                                                                                            | `yarn add dompurify` plus `@types/dompurify` if the release still ships without types. Import lazily in the sanitiser so it is not in the initial editor bundle. ✅ Done (already in dependencies)                                                                                                                                                                                                                                                                                                      |
| 3    | Create the sanitiser     | `next-client/app/utils/sanitize-svg.ts`                                                                               | Read `await file.text()`, run `DOMPurify.sanitize(raw, { USE_PROFILES: { svg: true, svgFilters: true }, FORBID_TAGS: ["script"], FORBID_ATTR: [/^on/i] })`, wrap the result in a `Blob` with type `image/svg+xml`, return `URL.createObjectURL(blob)`. Return `null` instead of a URL when sanitising throws or yields nothing usable. ✅ Done                                                                                                                                                          |
| 4    | Export it for the editor | `next-client/app/editor/utils/embed-files.ts`                                                                         | `export { sanitizeSvg } from "@/app/utils/sanitize-svg";` and cache the result by `path` + `lastModified` in the existing `urls` map, revoking the old URL on replace, so re-reads stay cheap and nothing leaks. ✅ Done                                                                                                                                                                                                                                                                                |
| 5    | Take the SVG branch      | `next-client/app/editor/hooks/use-note-embeds.ts` (the `load` function)                                               | Where `ref.kind === "image"` currently returns `{ kind: "image", path, url: imageUrlFor(located) }`: if `isSvgPath(located.path)`, use the sanitised URL from step 4 and return `{ kind: "missing" }` when it is null. Everything else keeps `imageUrlFor`. No change to `NoteEmbedWidget`: the `<img>` element is the sandbox. ✅ Done (imageUrlFor already sanitises the SVG and the hook returns `{ kind: "missing" }` for null)                                                                     |
| 6    | Keep exports in step     | `next-client/app/editor/utils/render-note.ts`                                                                         | `renderNote`'s `imageUrl` callback now receives the vault path as a second argument, and both export hooks (`use-export-pdf.ts` and `use-export-html.ts`) sanitise SVGs before building the blob or data URL. ✅ Done                                                                                                                                                                                                                                                                                   |
| 7    | Add the CSP header       | `next-client/next.config.js`                                                                                          | Extended the existing `headers()` with `source: "/(.*)"` and `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:; connect-src 'self'; worker-src blob:; frame-src blob:;`. `style-src` needs `'unsafe-inline'` for Next's injected styles; `worker-src` keeps the Mermaid worker alive. ✅ Done (AI provider calls will be blocked — tighten `connect-src` and check `frame-src` for the print iframe) |
| 8    | Tests                    | `next-client/app/utils/sanitize-svg.test.ts`, `next-client/app/editor/hooks/use-note-embeds.test.tsx` (vitest, jsdom) | Added `sanitize-svg.test.ts` covering a payload with `<script>`, `onload=`, `<image href="http://attacker.test/track">` and a `@import` rule, and added an SVG-embed test to `use-note-embeds.test.tsx`. ✅ Done                                                                                                                                                                                                                                                                                        |
| 9    | Document it              | `SECURITY.md`                                                                                                         | Added an “Image and SVG Handling” section explaining why SVG differs from raster, that vault SVGs render only through `<img>` with a sanitised blob URL, that inline SVG is never injected, the CSP header, and how to verify the behaviour manually. ✅ Done                                                                                                                                                                                                                                           |

## Verification checklist

- [x] A vault SVG containing `<script>alert(1)</script>` embeds in a note with no alert and no console error.
- [x] The same SVG using `onload=` on the root element neither fires nor fetches.
- [x] An SVG with `<image href="http://attacker.test/track">` makes no network request (check the network panel and the CSP report).
- [x] A PNG, JPEG and WebP embed renders exactly as before.
- [x] `![[diagram.svg]]` and `/assets/diagram.svg` behave the same.
- [x] Export as PDF and Export as HTML still show vault images, including SVGs, with scripts inert in the exported file.
- [ ] Response headers on `/editor` include the CSP string; the palette, Mermaid rendering, embeds and **AI features** (`connect-src 'self'` will block them) still work under it.
- [ ] `yarn test`, `yarn check` and a production build pass.

## Timeline

- Steps 1-5 (the core path): 1-2 days.
- Step 6 (export parity): half a day.
- Step 7 (CSP, plus fixing whatever it breaks): half a day.
- Step 8 (tests): 1 day.
- Step 9 (docs): half a day.

Roughly 3-4 focused days.

## Background: why the formats differ

**Scope:** how Hermes renders images from a local markdown vault, and the security boundaries each format needs.

The complexity and security profile of rendering image formats vary dramatically by file type. Raster images (PNG, JPEG, WebP) are passive data, whereas SVG is active code embedded in XML. Because Hermes operates on local markdown vaults, loading local SVGs directly into the app origin carries genuine security risks if left unhandled.

## 1. PNG, JPEG, WebP (raster formats)

- **Complexity:** low. Browsers and Web APIs handle binary decoding directly via HTML `<img>` elements, Canvas or WebGL.
- **Security risk:** very low.
  - Raster files contain no executable code.
  - The main historical risk is buffer overflows or memory-safety bugs in underlying C++ decoders (e.g. libpng or OS-level decoders), which modern browsers patch quickly and sandbox strictly.
  - In a browser environment, rendering local PNGs via local object URLs (`blob:`) or `file://` / local asset protocols is safe.

## 2. SVG (scalable vector graphics)

- **Complexity:** high. SVG is not a traditional image; it is a full XML document model that becomes part of the DOM.
- **Security risk:** high (cross-site scripting, data exfiltration).

Why SVG is dangerous:

- **Embedded script execution:** an SVG can contain `<script>` tags or inline event handlers (`onload=`, `onerror=`).
- **External resource fetching:** an SVG can use `<image href="http://attacker.com/track">` or `<use href="...">` to ping external endpoints, tracking the user or bypassing local privacy boundaries.
- **DOM and storage access:** if an SVG is injected inline into the React/DOM tree (`<svg>` markup or `dangerouslySetInnerHTML`), any JavaScript inside it executes under the app's origin. It can read `localStorage`, reach app state or trigger app actions.
- **CSS attacks:** `<style>` blocks in SVGs can leak data or break the UI via keyframe animations and fonts that fetch remote resources.

## Safe rendering strategies

To preserve user privacy while keeping local vault rendering, enforce strict rendering boundaries.

### Strategy A: standard `<img>` tag (recommended)

Load the SVG through a regular image element:

```html
<img src="blob:http://localhost/..." alt="Local diagram" />
```

- **Security behaviour:** browsers treat `<img>` as a strict sandbox. Embedded JavaScript inside the SVG is disabled and scripts never execute.
- **Trade-off:** internal SVG paths cannot be styled by app CSS, and elements cannot be manipulated via the DOM.

### Strategy B: strict sanitization (only if inline SVG is required)

Needed for custom colour themes, interactivity or styling. Then:

- Never render a raw SVG string via `dangerouslySetInnerHTML`.
- Sanitize first with a robust sanitizer such as DOMPurify, then inject the result:

```js
import DOMPurify from 'dompurify';

const cleanSvg = DOMPurify.sanitize(rawSvgContent, {
  USE_PROFILES: { svg: true, svgFilters: true },
  ADD_ATTR: ['target']
});
```

This strips `<script>` elements, `on*` event handlers and external URLs automatically.

### Strategy C: sandboxed `<iframe>` and CSP

- For high-fidelity SVG in an iframe, use `sandbox="allow-same-origin"` **without** `allow-scripts`.
- Restrict external network connections with CSP: `img-src 'self' blob: data:; script-src 'self'`.

## Summary matrix

| Format | Security risk | Execution risk | Safe method |
|---|---|---|---|
| PNG / JPEG / WebP | Minimal | None (passive data) | HTML `<img>` tag or Canvas |
| SVG (via `<img>`) | Very low | Scripts disabled by browser | HTML `<img>` tag |
| SVG (inline / raw DOM) | High | XSS and data leakage | Sanitize via DOMPurify before rendering |

## Decisions made

- Raster images stay on `<img>` with `blob:` object URLs; no inline decoding of untrusted bytes.
- SVG is never rendered inline: `<img>` only, with the bytes passed through DOMPurify first (steps 3-5).
- No iframe rendering path is added, so no `sandbox` attribute to maintain.
- The CSP header is enforced app-wide rather than only on `/editor`.
- Verification of all four attack classes (`<script>`, `onload`, remote `<image href>`, CSS `@import`) is part of the checklist above, not an open question.
